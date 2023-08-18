// ==UserScript==
// @name                Download Oreily Book
// @version             1.0
// @description         Places an icon on the book page that downloads the O'reilly book as HTML in a zip file
// @author              Adam Davis
// @match               https://learning.oreilly.com/library/view/*
// @icon                https://adamclayd.github.io/js-host/icons/oreilly/favicon-64.png
// @require             https://adamclayd.github.io/js-host/libraries/js/jquery.js
// @require             https://adamclayd.github.io/js-host/libraries/js/jquery-extension.js
// @require             https://adamclayd.github.io/js-host/libraries/js/jszip.min.js
// @require             https://adamclayd.github.io/js-host/libraries/js/bootstrap.bundle.min.js
// @resource worker     https://adamclayd.github.io/js-host/greasemonkey/service-workers/oreilly-book-worker.js
// @grant               GM_openInTab
// @grant               GM_getResourceText
// @grant               GM_download
// @grant               GM_notification
// @run-at              document-idle
// ==/UserScript==

(async function($) {
    'use strict';

    const base = "https://learning.oreilly.com";
    const tabTimeout = 3000;
    const storageKeyPart = 'orielyBookUrlPart';
    const storageKeyPage = 'orielyBookPage';
    const clone = $('html').clone();
    const pages = [];

    let dlKey = /.+?\/library\/view\/(.+?)\/.+?$/.exec(location.href)[1];
    let coverPageExp = new RegExp('^.+?\\/library\\/view\\/' + dlKey + '\\/.+?\\/[Cc]over\.x?html$');
    let download = null;
    let $qDl = null;

    let worker = new SharedWorker('data:application/javascript;base64,' + btoa(GM_getResourceText('worker')));
    worker.port.start();

    worker.port.addEventListener('message', function(e) {
        let msg = e.data;
        if(msg.action === 'send-download') {
            $qDl.resolve(msg.data);
        }
        else if(msg.action === 'report-progress') {
            $qDl.resolve(msg.progress);
        }
    });

    async function getCoverPage() {
        let jq = clone;
        let url = location.href;
        let prev;
        while(!coverPageExp.test(url) && (prev = jq.find('div[class^="_prevContainer"]>a')).length) {
            let url = base + prev.attr('href');

            let r = fetch(url, {method: 'GET'});
            let html = await r.text();

            html = html.substring(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body'));

            jq = $(html);
        }

        return coverPageExp.test(url) ? url : null;
    }

    function alphaGen(x) {
        function randAlphaGen() {
            let A = 65;
            let Z = 90;
            let a = 97;
            let z = 122;

            let numbers = [];

            for(let i = A; i <= Z; i++)
                numbers.push(i);

            for(let i = a; i <= z; i++)
                numbers.push(i);

            return numbers[Math.floor(Math.random() * numbers.length)];
        };

        let u8 = new Uint8Array(x);

        for(let i in u8)
            u8[i] = randAlphaGen();

        return new TextDecoder().decode(u8);
    };

    function getFileName(url) {
        return url.substring(url.lastIndexOf('/') + 1);
    }

    function getPage(jq) {
        if(download) {
            let $next = jq.find('div[class^="_nextContainer"]>a');
            let nextUrl = $next.length ? base + $next.attr('href') : null;

            let title = jq.find('div[class^="_currentTitle"]').text();

            function setbase(i, v) {
                return base + v;
            }

            jq.find('.orm-Link-root').attr('href', function(i, v) {
                return getFileName(v);
            });

            jq.find('#root>header').remove();
            jq.find('#content-navigation .orm-ProgressBar-root').remove();
            jq.find('section[class^="_iconMenu"]').remove();
            jq.find('.orm-Link-root').attr('href', setbase);
            jq.find('link[href^="/"]').attr('href', setbase);
            jq.find('script[src^="/"]').attr('src', setbase);


            if(download.pages.length === 0) {
                jq.find('div[class^="_prevContainer"]>a').remove();
            }

            if(!download.pages.find(pg => pg.link === getFileName(location.href))) {
                let data = {
                    html: jq.outerTagHtml(),
                    link: getFileName(location.href),
                    title: title
                };

                worker.port.postMessage({
                    action: 'add-page',
                    key: dlKey,
                    data: data
                });

                if(!nextUrl)
                    download.pages.push(data);
            }

            if(nextUrl) {
                location.href = nextUrl;
            }
            else {
                console.log('Not aborted');
                let zip = new JSZip();
                let foldername = download.bookTitle.replaceAll(/(: | : | :|; | ; | ;|\/ | \/ | \/|\\ | \\ | \\|, | , | ,|,| )/g, '_');
                let folder = zip.folder(foldername);
                let index = createIndex(download.pages);

                zip.file(foldername + '/index.html', index);
                console.log('added index.html');
                for(let page of download.pages) {
                    console.log(page.html);
                    zip.file(foldername + '/' + page.link, page.html);
                    console.log('added ' + page.link);
                }
                zip.generateAsync({type: 'blob'}, function(meta) {
                    console.log('Percent: ' + meta.percent.toFixed(2) + '\nFile: ' + meta.currentFile);
                }).then(function(blob) {
                    console.log(blob);

                    let blobUrl = URL.createObjectURL(blob);
                    console.log(blobUrl);
                    GM_download({
                        url: blobUrl,
                        name: foldername + '.zip',
                        saveAs: true,
                        onload: function() {
                            URL.revokeObjectURL(blob);
                        },
                        onerror: function(e) {
                            console.error(e);
                            URL.revokeObjectURL(blob);
                        }
                    });

                    worker.port.postMessage({action: 'delete-download', key: dlKey});
                });
            }
        }
        else {
            let control = GM_notification(ex.message);
            setTimeout(control.remove, 5000);
            worker.port.postMessage({action: 'delete-download', key: dlKey});
        }
    }

    function createIndex(bookTitle) {
        let index = $('<html></html>').append($('<head></head>').append($(
            '<link href="http://adamclayd.github.io/js-host/libraries/css/bootstrap.min.css" rel="stylesheet" />\n' +
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />\n'+
            '<style>\n' +
            '	#mobileMenuBtn {\n'+
            '		position: absolute;\n' +
            '		top: 10px;\n' +
            '		left: 5px;\n' +
            '	}\n\n' +

            '	#mCol, #content {\n' +
            '		overflow-y: scroll;\n' +
            '		scrollbar-color: #c5c5c5 #e5e5e5;\n' +
            '	}\n\n' +

            '		#mCol {\n' +
            '			scrollbar-width: 2px;\n' +
            '		}\n\n' +

            '		#content {\n' +
            '		scrollbar-width: 4px;\n' +
            '	}\n\n' +

            '	#mCol::-webkit-scrollbar {\n' +
            '		width: 2px;\n' +
            '	}\n' +

            '	#content::-webkit-scrollbar {\n' +
            '		width: 4px;\n' +
            '	}\n\n' +

            '	#mCol::-webkit-scrollbar-track, #content::-webkit-scrollbar-track {\n' +
            '		background: #e5e5e5;\n' +
            '		border-radius: 20px;\n' +
            '	}\n\n' +

            '	#mCol::-webkit-scrollbar-thumb, #conten::-webkit-scrollbar-thumb {\n' +
            '		background-color: #cccccc;\n' +
            '		border-radius: 20px;\n' +
            '	}\n' +
            '</style>\n'
        )));

        index.append($('<body></body').append($(
            '        <div class="container-fluid" style="position: relative;">\n' +
            '            <div class="row">\n' +
            '                <div class="col-12 text-bg-danger text-center py-1" id="title"><h4>' + download.bookTitle + '</h4></div>\n' +
            '            </div>\n' +
            '            <div class="row">\n' +
            '                <div class="col-12 col-md-3 vh-100 text-bg-danger collapse show" id="mCol">\n' +
            '                </div>\n' +
            '                <div class="col-12 col-md-9 vh-100" id="cCol">\n' +
            '                    <iframe class="w-100 h-100" src="' + download.pages[0].link + '" id="content" />\n'+
            '                </div>\n' +
            '            </div>\n' +
            '            <button type="button" class="btn btn-sm btn-dark" id="mobileMenuBtn" data-bs-toggle="collapse" data-bs-target="#mCol"><i class="bi bi-justify"></i></button>\n' +
            '        </div>\n' +
            '        <script src="https://adamclayd.github.io/js-host/libraries/js/bootstrap.bundle.min.js"></script>\n' +
            '        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>\n' +
            '        <script>\n'+
            '            (function($) {\n' +
            '                if(window.innerWidth < 768) {\n' +
            '                    $("#mCol").collapse("hide");\n' +
            '                }\n\n' +

            '                $("#mobilemMenuBtn").click(function() {\n'+
            '                    $("#mCol").collapse("toggle");\n'+
            '                });\n\n' +

            '                $("#menu button").click(function() {\n'+
            '                    $("#menu button.active").removeClass("active");\n' +
            '                    $(this).addClass("active disabled");\n\n' +

            '                    $("#content").attr("src", $(this).data("link"));\n' +
            '                });\n\n' +

            '                $("#content").on("load", function() {\n' +
            '                     $(this).contents().find(\'[class^="prevContainer"] .orm-Link-root\').click(function() {\n' +
            '                         let current = $("#menu>button.active");\n\n' +

            '                         current.removeClass("active disabled");\n' +
            '                         current.prev().addClass("active disabled");\n' +
            '                     });\n\n' +

            '                     $(this).contents().find(\'[class^="nextContainer"] .orm-Link-root\').click(function() {\n' +
            '                         let current = $("#menu>button.active");\n\n' +

            '                         current.removeClass("active disabled");\n' +
            '                         current.next().addClass("active disabled");\n' +
            '                     });\n' +
            '                });\n' +
            '            })(jQuery);\n' +
            '        </script>\n'
        )));


        let menu = $('<div class="list-group py-5" id="menu"></div>');
        for(let {title, link} of pages) {
            menu.append($('<button  class="list-group-item list-group-item-action" data-link="' + link + '">' + title + '</button>'));
        }

        menu.find('button:nth-child(1)').addClass('active disabled');

        index.find('#mCol').append(menu);

        return index.outerTagHtml();
    }

    function getPageCount() {
        return new Promise(function(r, j) {
            $('#table-of-contents-tooltip').click();
            setTimeout(function() {
                let count = ($('ol[class^="_tableOfContents"] li').length);
                $('div[class^="_optionsWrapper"]>button:nth-child(2)').click();
                r(count);
            }, 5);
        });
    }

    function createProgressbar(bookTitle) {
        return new Promise(function(r) {
            setTimeout(function() {
                let $progress = $(
                    '\n<div class="alert alert-light alert-dismissable fade show" role="alert" style="width: 400px; position: fixed; top: 20px; right: 45px; z-index: 9999">\n'+
                    '    <div class="row">\n'+
                    '        <div class="col-10 text-center text-nowrap" id="progress-status" style="font-size: 5pt; overflow: hidden; text-overflow: ellipsis;">' + bookTitle + '</div>\n'+
                    '    </div>\n'+
                    '    <div class="row">\n'+
                    '        <div class="col-10">\n'+
                    '            <div class="progress" role="progressbar" aria-valuenow="0" arai-valuemin="0" aria-valuemax="100">\n'+
                    '                <div class="progress-bar" style="width: 0%;">0%</div>\n'+
                    '            </div>\n'+
                    '        </div>\n'+
                    '        <div class="col-1">\n'+
                    '            <button type="button" class="btn-close"></button>\n'+
                    '        </div>\n'+
                    '    </div>\n'+
                    '    <div class="row">\n'+
                    '        <div class="col-10 text-end" style="font-size: 6pt;">\n'+
                    '            <span id="progress-count">0</span>/' + download.numPages + '\n'+
                    '        </div>\n'+
                    '    </div>\n'+
                    '</div>\n'
                );

                let int = setInterval(async function() {
                    $qDl = $.Deferred();
                    worker.port.postMessage({action: 'request-progress', key: dlKey})

                    let progress = await new Promise(function(r, j) { $qDl.then(r, j) });
                    if(progress) {
                        $progress.find('.progress-bar').css('width', progress.value + '%').text(progress.value);
                        $progress.find('#progress-count').text(progress.numPages);

                        if(progress.value === 100) {
                            $progress.find('#progress-status').text('Zipping files');
                        }
                    }
                    else {
                        $progress.remove();
                        clearInterval(int);
                    }
                }, 1000);

                $progress.find('.btn-close').click(function() {
                    worker.port.postMessage({action: 'delete-download', key: dlKey});
                    $progress.remove();
                });

                $('body').append($progress);

                r($progress);
            });
        });
    }

    async function getBookTitle(cover) {
        let r = await fetch(cover, {method: 'GET'});
        let html = await r.text();
        html = html.substring(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body'));
        return $(html).find('div[class^="_prevContainer"]>a>:nth-child(2)').text();
    }


    $('head').append('<link rel="stylesheet" href="https://adamclayd.github.io/js-host/libraries/css/bootstrap.min.css" />');

    $qDl = $.Deferred();

    worker.port.postMessage({action: 'get-download', key: dlKey});
    download = await new Promise(function(r, j) {$qDl.then(r, j)});
    console.log(download);
    if(!download) {
        let cover = await getCoverPage();
        if(cover) {
            download = {};
            console.warn(GM_getResourceURL('icon'));
            let dlIcon = $('<a href="#"><img src="https://adamclayd.github.io/js-host/icons/oreilly/favicon-24.png" /></a>');
            dlIcon.tooltip({title: 'Download as HTML ZIP file'});
            dlIcon.click(function(e) {
                e.preventDefault();

                (async () => {
                    download.bookTitle = await getBookTitle(cover);
                    download.numPages = await getPageCount();
                    download.pages = [];
                    download.tabId = alphaGen(64);

                    worker.port.postMessage({action: 'add-download', key: dlKey, data: download});

                    GM_openInTab(cover, true);

                    await createProgressbar(download.bookTitle);
                    dlIcon.remove();
                })();
            });

            $('body').append(dlIcon);

            setTimeout(function() {
                let pos = dlIcon.fixedPositionPlacement($('#root>header'), 'bottom');

                dlIcon.css({
                    'position': 'fixed',
                    'left': (pos.x + 8) + 'px',
                    'top': (pos.y + 10) + 'px',
                    'z-index': 9999
                });
            }, 5);
        }
        else {
            let control = GM_notification('Cannot find the cover page to start downloading');
            setTimout(control.close, 5000);
        }
    }
    else if(download && coverPageExp.test(location.href) && !download.pages.length) {
        console.log('applying tab id')
        window.name = download.tabId;
        getPage(clone, getFileName(location.href));
    }
    else if (download && window.name === download.tabId) {
        getPage(clone, getFileName(location.href));
    }
    else if(download && window.name !== download.tabId) {
        console.log('Not the running tab');
        await createProgressbar(download.bookTitle);
    }
})(jQuery);