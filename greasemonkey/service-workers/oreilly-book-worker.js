const downloads = {};
const ports = [];

onconnect = function (ev) {
    let port = ev.ports[0];
    ports.push(port);

    port.addEventListener('message', function(e) {
        let msg = e.data;

        if(msg.action === 'get-download') {
            if(downloads[msg.key]) {
                port.postMessage({action: 'send-download', data: downloads[msg.key]});
            }
            else {
                port.postMessage({action: 'send-download', data: null});
            }
        }
        else if(msg.action === 'add-download') {
            if(!downloads[msg.key]) {
                downloads[msg.key] = msg.data;
            }
        }
        else if(msg.action === 'delete-download') {
            if(downloads[msg.key])
                delete downloads[msg.key];
        }
        else if(msg.action === 'request-progress') {
            if(downloads[msg.key]) {
                let download = downloads[msg.key];
                let progress = {
                    value: Math.floor((download.pages.length / download.numPages) * 100),
                    numPages: download.pages.length
                }

                port.postMessage({action: 'report-progress', progress: progress});
            }
            else {
                port.postMessage({action: 'report-progress', progress: {}});
            }
        }
        else if(msg.action === 'abort-download') {
            let download = downloads[msg.key];
            if(download)
                download.aborted = true;
        }
        else if(msg.action === 'add-page') {
            let download = downloads[msg.key];
            if(download)
                download.pages.push(msg.data);
        }
    });

    port.start();
}