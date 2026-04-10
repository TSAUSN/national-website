const myCarousel = document.getElementById("carousel");

if(myCarousel) {
	const prevcarouselBtn = myCarousel.querySelector(".carousel-control-prev");
	const nextcarouselBtn = myCarousel.querySelector(".carousel-control-next");

	myCarousel.addEventListener("slide.bs.carousel", (event) => {
		const items = myCarousel.querySelectorAll(".carousel-item");
		
		if (event.to === 0) {
			prevcarouselBtn.classList.add("hide");
		} else {
			prevcarouselBtn.classList.remove("hide");
		}

		if (event.to === items.length - 1) {
			nextcarouselBtn.classList.add("hide");
		} else {
			nextcarouselBtn.classList.remove("hide");
		}
	});
}
