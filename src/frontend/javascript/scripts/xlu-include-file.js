// https://stackoverflow.com/questions/40162907/w3includehtml-sometimes-includes-twice
/*
function xLuIncludeFile() {
    let z, i, a, file, xhttp;

    z = document.getElementsByTagName("*");

    for (i = 0; i < z.length; i++) {
        if (z[i].getAttribute("xlu-include-file")) {
            a = z[i].cloneNode(false);
            file = z[i].getAttribute("xlu-include-file");
            xhttp = new XMLHttpRequest();

            xhttp.onreadystatechange = function () {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    a.removeAttribute("xlu-include-file");
                    a.innerHTML = xhttp.responseText;
                    z[i].parentNode.replaceChild(a, z[i]);
                    xLuIncludeFile();
                }
            }

            // false makes the send operation synchronous, which solves a problem
            // when using this function in short pages with Chrome. But it is
            // deprecated on the main thread due to its impact on responsiveness.
            // This call may end up throwing an exception someday.

            xhttp.open("GET", file, false);
            xhttp.send();

            return;
        }
    }
}
*/

async function xLuIncludeFile() {
    // Buscamos el primer elemento que tenga el atributo xlu-include-file
    let el = document.querySelector("[xlu-include-file]");

    // Si no hay más elementos que incluir, disparamos el evento de finalización
    if (!el) {
        window.dispatchEvent(new CustomEvent('xlu-includes-complete'));
        return;
    }

    // Capturamos el archivo antes de cualquier await para seguridad
    let file = el.getAttribute("xlu-include-file");
    let a = el.cloneNode(false);

    try {
        let response = await fetch(file);
        if (response.ok) {
            let content = await response.text();

            // Lógica de plantillas (artículos)
            if (file === "article-template.html") {
                let articleData = {
                    title: el.getAttribute("data-title"),
                    subtitle: el.getAttribute("data-subtitle"),
                    date: el.getAttribute("data-date"),
                    displayDate: el.getAttribute("data-display-date"),
                    content: el.getAttribute("data-content"),
                    image: el.getAttribute("data-image"),
                    imageCaption: el.getAttribute("data-image-caption")
                };

                content = content.replace(/{{title}}/g, articleData.title || '')
                    .replace(/{{subtitle}}/g, articleData.subtitle || '')
                    .replace(/{{date}}/g, articleData.date || '')
                    .replace(/{{displayDate}}/g, articleData.displayDate || '')
                    .replace(/{{content}}/g, articleData.content || '')
                    .replace(/{{image}}/g, articleData.image || '')
                    .replace(/{{imageCaption}}/g, articleData.imageCaption || '');
            }

            // Limpiamos el atributo para que no se vuelva a procesar el mismo elemento
            a.removeAttribute("xlu-include-file");
            a.innerHTML = content;

            // Realizamos el reemplazo en el DOM usando la referencia guardada 'el'
            if (el.parentNode) {
                el.parentNode.replaceChild(a, el);
            }

            // Llamada recursiva para procesar el siguiente elemento (o posibles hijos incluidos)
            await xLuIncludeFile();
        } else {
            console.error("Error fetching file:", file, response.status);
            // Si falla, quitamos el atributo para no entrar en bucle infinito
            el.removeAttribute("xlu-include-file");
            await xLuIncludeFile();
        }
    } catch (error) {
        console.error("Exception fetching file:", file, error);
        el.removeAttribute("xlu-include-file");
        await xLuIncludeFile();
    }
}

