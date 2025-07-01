const words = ["Ganokpan", "Developer", "Designer", "Bug Generator"];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingElement = document.getElementById("typing");
const speed = 120; // typing speed
const pause = 1500; // pause between words

function type() {
    const currentWord = words[wordIndex];
    if (!isDeleting) {
        typingElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
        if (charIndex === currentWord.length) {
            isDeleting = true;
            setTimeout(type, pause);
            return;
        }
    } else {
        typingElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
        }
    }
    setTimeout(type, isDeleting ? speed / 2 : speed);
}

document.addEventListener("DOMContentLoaded", type);
