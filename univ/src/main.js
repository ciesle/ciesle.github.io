const hamburger = document.getElementsByClassName("hamburger")[0];
const relativeSite = document.getElementsByClassName("other-sites")[0];
function toggleHamburger() {
	hamburger.classList.toggle("active");
	if (hamburger.classList.contains("active")) {
		relativeSite.style.left = "50%";
	}
	else {
		relativeSite.style.left = "100%";
	}
}
hamburger.onclick = toggleHamburger;