/*
=====================================
CITY4CHRIST PWA CORE JAVASCRIPT
=====================================
*/



document.addEventListener(
"DOMContentLoaded",
()=>{


console.log(
"City4Christ Application Ready"
);



initializeAnimations();

activateNavigation();



});





/*
SCROLL REVEAL
*/


function initializeAnimations(){


const elements =
document.querySelectorAll(
".faith-card, .scripture-card, .welcome-card"
);



const observer =
new IntersectionObserver(

(entries)=>{


entries.forEach(entry=>{


if(entry.isIntersecting){


entry.target.classList.add(
"fade-up"
);


}


});


},

{

threshold:.2

}


);



elements.forEach(
element=>{

observer.observe(element);


});


}







/*
BOTTOM NAVIGATION
*/


function activateNavigation(){


const navLinks =
document.querySelectorAll(
".bottom-nav a"
);



navLinks.forEach(link=>{


link.addEventListener(
"click",

()=>{


navLinks.forEach(item=>{

item.classList.remove(
"active"
);


});


link.classList.add(
"active"
);


}

);


});


}







/*
ENTER APP
*/


function enterApp(){


window.location.href =
"auth.html";


}








/* ======================================
CITY4CHRIST GLOBAL THEME
====================================== */

function applyCityTheme(theme){

    document.documentElement
    .removeAttribute("data-theme");


    if(theme === "dark"){

        document.documentElement
        .setAttribute(
            "data-theme",
            "dark"
        );

    }


    else if(theme === "system"){

        const systemDark =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


        if(systemDark){

            document.documentElement
            .setAttribute(
                "data-theme",
                "dark"
            );

        }

    }

}



function loadCityTheme(){

    const savedTheme =
    localStorage.getItem(
        "city4christ-theme"
    )
    || "system";


    applyCityTheme(
        savedTheme
    );

}


loadCityTheme();


window
.matchMedia(
    "(prefers-color-scheme: dark)"
)
.addEventListener(
"change",
function(){

    const savedTheme =
    localStorage.getItem(
        "city4christ-theme"
    )
    || "system";


    if(savedTheme === "system"){

        applyCityTheme(
            "system"
        );

    }

});


/* ======================================
PWA SERVICE WORKER
====================================== */

if(
    "serviceWorker"
    in navigator
){

    window.addEventListener(
    "load",
    function(){

        navigator
        .serviceWorker
        .register(
            "./service-worker.js"
        )

        .then(registration => {

            console.log(
                "City4Christ Service Worker registered:",
                registration.scope
            );

        })

        .catch(error => {

            console.error(
                "Service Worker registration failed:",
                error
            );

        });

    });

}