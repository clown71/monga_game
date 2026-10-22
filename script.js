const menuToggle = document.querySelector(".menu-toggle");
const menuClose = document.querySelector(".menu-close");
const menuBackdrop = document.querySelector(".menu-backdrop");
const sideMenu = document.querySelector(".side-menu");
const carousel = document.querySelector(".carousel");
const carouselViewport = document.querySelector(".carousel-viewport");
const carouselTrack = document.querySelector(".carousel-track");
const carouselEmpty = document.querySelector(".carousel-empty");
const carouselIndicators = document.querySelector(".carousel-indicators");
const previousSlideButton = document.querySelector(".carousel-previous");
const nextSlideButton = document.querySelector(".carousel-next");
const autoplayButton = document.querySelector(".carousel-autoplay");

let slides = [];
let activeSlideIndex = 0;
let autoplayTimer;
let controlsTimer;
let autoplayPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pointerStart;
let suppressClick = false;

function getSlideTarget(source) {
	const fileName = decodeURIComponent(new URL(source, document.baseURI).pathname.split("/").pop());
	const pageName = fileName.replace(/\.[^.]+$/, "");
	return `${encodeURIComponent(pageName)}.html`;
}

async function loadSlideFiles() {
	const directoryUrl = new URL("images/", document.baseURI);

	try {
		const response = await fetch(directoryUrl);
		if (!response.ok) throw new Error("Unable to read image directory");

		const listing = new DOMParser().parseFromString(await response.text(), "text/html");
		return [...new Set([...listing.querySelectorAll("a[href]")].flatMap((link) => {
			const imageUrl = new URL(link.getAttribute("href"), response.url);
			const relativePath = imageUrl.pathname.slice(directoryUrl.pathname.length);
			if (imageUrl.origin !== directoryUrl.origin || relativePath.includes("/")) return [];

			const fileName = decodeURIComponent(relativePath);
			return /\.(avif|gif|jpe?g|png|webp)$/i.test(fileName) ? [fileName] : [];
		}))].sort((first, second) => first.localeCompare(second, "zh-Hant"));
	} catch {
		carouselEmpty.textContent = "無法讀取 images 資料夾，請確認伺服器提供目錄索引。";
		return [];
	}
}

function showSlide(index) {
	if (slides.length === 0) return;

	activeSlideIndex = (index + slides.length) % slides.length;
	const slideElements = carouselTrack.querySelectorAll(".carousel-slide");
	const indicatorElements = carouselIndicators.querySelectorAll(".carousel-indicator");

	slideElements.forEach((slide, slideIndex) => {
		const isActive = slideIndex === activeSlideIndex;
		slide.classList.toggle("is-active", isActive);
		slide.setAttribute("aria-hidden", String(!isActive));
		slide.inert = !isActive;
	});

	indicatorElements.forEach((indicator, indicatorIndex) => {
		indicator.setAttribute("aria-current", String(indicatorIndex === activeSlideIndex));
	});
}

function updateAutoplayButton() {
	const isPlaying = !autoplayPaused;
	autoplayButton.setAttribute("aria-pressed", String(autoplayPaused));
	autoplayButton.setAttribute("aria-label", isPlaying ? "暫停自動播放" : "開始自動播放");
	autoplayButton.innerHTML = `<span aria-hidden="true">${isPlaying ? "Ⅱ" : "▶"}</span>`;
}

function startAutoplay() {
	clearInterval(autoplayTimer);
	if (slides.length > 1 && !autoplayPaused) {
		autoplayTimer = setInterval(() => showSlide(activeSlideIndex + 1), 5000);
	}
}

async function initializeCarousel() {
	const slideFiles = await loadSlideFiles();
	slides = slideFiles.map((fileName) => ({ src: `images/${encodeURIComponent(fileName)}`, alt: "" }));

	if (slides.length === 0) {
		autoplayButton.disabled = true;
		previousSlideButton.disabled = true;
		nextSlideButton.disabled = true;
		return;
	}

	carousel.classList.add("has-slides");
	previousSlideButton.disabled = slides.length < 2;
	nextSlideButton.disabled = slides.length < 2;
	autoplayButton.disabled = slides.length < 2;

	slides.forEach((slide, index) => {
		const link = document.createElement("a");
		link.className = "carousel-slide";
		link.href = getSlideTarget(slide.src);
		link.setAttribute("aria-label", `前往 ${getSlideTarget(slide.src)}`);
		link.setAttribute("aria-hidden", "true");
		link.inert = true;

		const image = document.createElement("img");
		image.src = slide.src;
		image.alt = slide.alt || "";
		image.loading = index === 0 ? "eager" : "lazy";
		link.append(image);
		carouselTrack.append(link);

		const indicator = document.createElement("button");
		indicator.className = "carousel-indicator";
		indicator.type = "button";
		indicator.setAttribute("aria-label", `顯示第 ${index + 1} 張圖片`);
		indicator.setAttribute("aria-current", "false");
		indicator.addEventListener("click", () => {
			showSlide(index);
			showCarouselControls();
			startAutoplay();
		});
		carouselIndicators.append(indicator);
	});

	showSlide(0);
	updateAutoplayButton();
	startAutoplay();
}

function showCarouselControls() {
	carousel.classList.add("is-controls-visible");
	clearTimeout(controlsTimer);
	controlsTimer = setTimeout(() => {
		carousel.classList.remove("is-controls-visible");
	}, 2500);
}

function handleSwipeStart(event) {
	if (event.pointerType === "mouse") return;
	pointerStart = { x: event.clientX, y: event.clientY };
	showCarouselControls();
}

function handleSwipeEnd(event) {
	if (!pointerStart) return;
	const deltaX = event.clientX - pointerStart.x;
	const deltaY = event.clientY - pointerStart.y;
	pointerStart = null;

	if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

	showSlide(activeSlideIndex + (deltaX < 0 ? 1 : -1));
	startAutoplay();
	suppressClick = true;
	setTimeout(() => {
		suppressClick = false;
	}, 400);
}

function setMenuOpen(isOpen) {
	document.body.classList.toggle("menu-open", isOpen);
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuToggle.setAttribute("aria-label", isOpen ? "關閉側邊選單" : "開啟側邊選單");
	sideMenu.setAttribute("aria-hidden", String(!isOpen));
	sideMenu.inert = !isOpen;

	if (isOpen) {
		menuClose.focus();
	} else {
		menuToggle.focus();
	}
}

menuToggle.addEventListener("click", () => {
	setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

menuClose.addEventListener("click", () => setMenuOpen(false));
menuBackdrop.addEventListener("click", () => setMenuOpen(false));

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
		setMenuOpen(false);
	}
});

previousSlideButton.addEventListener("click", () => {
	showSlide(activeSlideIndex - 1);
	showCarouselControls();
	startAutoplay();
});

nextSlideButton.addEventListener("click", () => {
	showSlide(activeSlideIndex + 1);
	showCarouselControls();
	startAutoplay();
});

autoplayButton.addEventListener("click", () => {
	autoplayPaused = !autoplayPaused;
	updateAutoplayButton();
	showCarouselControls();
	startAutoplay();
});

carouselViewport.addEventListener("pointerdown", handleSwipeStart);
carouselViewport.addEventListener("pointerup", handleSwipeEnd);
carouselViewport.addEventListener("pointercancel", () => {
	pointerStart = null;
});
carouselViewport.addEventListener("click", (event) => {
	if (!suppressClick) return;
	event.preventDefault();
	event.stopPropagation();
	suppressClick = false;
}, true);
carouselViewport.addEventListener("keydown", (event) => {
	if (event.key === "ArrowLeft" && slides.length > 1) {
		showSlide(activeSlideIndex - 1);
		showCarouselControls();
		startAutoplay();
	} else if (event.key === "ArrowRight" && slides.length > 1) {
		showSlide(activeSlideIndex + 1);
		showCarouselControls();
		startAutoplay();
	}
});

initializeCarousel();
