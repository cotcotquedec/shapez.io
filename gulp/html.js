const buildUtils = require("./buildutils");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { BUILD_VARIANTS } = require("./build_variants");

function computeIntegrityHash(fullPath, algorithm = "sha256") {
    const file = fs.readFileSync(fullPath);
    const hash = crypto.createHash(algorithm).update(file).digest("base64");
    return algorithm + "-" + hash;
}

/**
 * PROVIDES (per <variant>)
 *
 * html.<variant>.dev
 * html.<variant>.prod
 */
function gulptasksHTML($, gulp, buildFolder) {
    const commitHash = buildUtils.getRevision();
    async function buildHtml({
        googleAnalytics = false,
        standalone = false,
        integrity = true,
        enableCachebust = true,
    }) {
        function cachebust(url) {
            if (enableCachebust) {
                return buildUtils.cachebust(url, commitHash);
            }
            return url;
        }

        const hasLocalFiles = standalone;

        return gulp
            .src("../src/html/" + (standalone ? "index.standalone.html" : "index.html"))
            .pipe(
                $.dom(
                    /** @this {Document} **/ function () {
                        const document = this;

                        // Append css
                        const css = document.createElement("link");
                        css.rel = "stylesheet";
                        css.type = "text/css";
                        css.media = "none";
                        css.setAttribute("onload", "this.media='all'");
                        css.href = cachebust("main.css");
                        if (integrity) {
                            css.setAttribute(
                                "integrity",
                                computeIntegrityHash(path.join(buildFolder, "main.css"))
                            );
                        }
                        document.head.appendChild(css);

                        // Google analytics
                        if (googleAnalytics) {
                            const tagManagerScript = document.createElement("script");
                            tagManagerScript.src =
                                "https://www.googletagmanager.com/gtag/js?id=UA-165342524-1";
                            tagManagerScript.setAttribute("async", "");
                            document.head.appendChild(tagManagerScript);

                            const initScript = document.createElement("script");
                            initScript.textContent = `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'UA-165342524-1', { anonymize_ip: true });
                        `;
                            document.head.appendChild(initScript);
                        }

                        // Do not need to preload in app or standalone
                        if (!hasLocalFiles) {
                            // Preload essentials
                            const preloads = [
                                "res/fonts/GameFont.woff2",
                                // "async-resources.css",
                                // "res/sounds/music/theme-short.mp3",
                            ];

                            preloads.forEach(src => {
                                const preloadLink = document.createElement("link");
                                preloadLink.rel = "preload";
                                preloadLink.href = cachebust(src);
                                if (src.endsWith(".woff2")) {
                                    preloadLink.setAttribute("crossorigin", "anonymous");
                                    preloadLink.setAttribute("as", "font");
                                } else if (src.endsWith(".css")) {
                                    preloadLink.setAttribute("as", "style");
                                } else if (src.endsWith(".mp3")) {
                                    preloadLink.setAttribute("as", "audio");
                                } else {
                                    preloadLink.setAttribute("as", "image");
                                }
                                document.head.appendChild(preloadLink);
                            });
                        }

                        let fontCss = `
                        @font-face {
                            font-family: "GameFont";
                            font-style: normal;
                            font-weight: normal;
                            font-display: swap;
                            src: url('${cachebust("res/fonts/GameFont.woff2")}') format("woff2");
                        }
                        `;
                        let loadingCss =
                            fontCss + fs.readFileSync(path.join(__dirname, "preloader.css")).toString();

                        const style = document.createElement("style");
                        style.setAttribute("type", "text/css");
                        style.textContent = loadingCss;
                        document.head.appendChild(style);

                        // Append loader, but not in standalone (directly include bundle there)
                        if (standalone) {
                            const bundleScript = document.createElement("script");
                            bundleScript.type = "text/javascript";
                            bundleScript.src = "bundle.js";
                            if (integrity) {
                                bundleScript.setAttribute(
                                    "integrity",
                                    computeIntegrityHash(path.join(buildFolder, "bundle.js"))
                                );
                            }
                            document.head.appendChild(bundleScript);
                        } else {
                            const loadJs = document.createElement("script");
                            loadJs.type = "text/javascript";
                            let scriptContent = "";
                            scriptContent += `var bundleSrc = '${cachebust("bundle.js")}';\n`;
                            // scriptContent += `var bundleSrcTranspiled = '${cachebust(
                            //     "bundle-transpiled.js"
                            // )}';\n`;

                            if (integrity) {
                                scriptContent +=
                                    "var bundleIntegrity = '" +
                                    computeIntegrityHash(path.join(buildFolder, "bundle.js")) +
                                    "';\n";
                                // scriptContent +=
                                //     "var bundleIntegrityTranspiled = '" +
                                //     computeIntegrityHash(path.join(buildFolder, "bundle-transpiled.js")) +
                                //     "';\n";
                            } else {
                                scriptContent += "var bundleIntegrity = null;\n";
                                scriptContent += "var bundleIntegrityTranspiled = null;\n";
                            }

                            scriptContent += fs.readFileSync("./bundle-loader.js").toString();
                            loadJs.textContent = scriptContent;
                            document.head.appendChild(loadJs);
                        }

                        const bodyContent = `
                <div id="ll_fp">_</div>
                <div id="ll_p">
                    <div id="ll_logo">
                        <img
                            src='data:image/png;base64,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'
                            width="300"
                        >
                    </div>
                    <div id="ll_loader">
                        <span class='ll_spinner'></span>
                        <div class='ll_text' id='preload_ll_text'>${
                            hasLocalFiles ? "Loading" : "Downloading"
                        } Game Files</div >
                        <div id="ll_progressbar">
                            <span></span>
                            <div id="ll_preload_status">Downloading Bundle</div>
                        </div>
                        <div id="ll_standalone">
                            Page does not load? Try the <a href="https://get.shapez.io/slowpageload" target="_blank">Steam Version</a>!
                        </div>
                    </div>
                </div >
                `;

                        document.body.innerHTML = bodyContent;
                    }
                )
            )
            .pipe(
                $.htmlmin({
                    caseSensitive: true,
                    collapseBooleanAttributes: true,
                    collapseInlineTagWhitespace: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: true,
                    minifyJS: true,
                    minifyCSS: true,
                    quoteCharacter: '"',
                    useShortDoctype: true,
                })
            )
            .pipe($.htmlBeautify())
            .pipe($.rename("index.html"))
            .pipe(gulp.dest(buildFolder));
    }

    for (const variant in BUILD_VARIANTS) {
        const data = BUILD_VARIANTS[variant];
        gulp.task("html." + variant + ".dev", () => {
            return buildHtml({
                googleAnalytics: false,
                standalone: data.standalone,
                integrity: false,
                enableCachebust: false,
            });
        });
        gulp.task("html." + variant + ".prod", () => {
            return buildHtml({
                googleAnalytics: !data.standalone,
                standalone: data.standalone,
                integrity: true,
                enableCachebust: !data.standalone,
            });
        });
    }
}

module.exports = {
    gulptasksHTML,
};
