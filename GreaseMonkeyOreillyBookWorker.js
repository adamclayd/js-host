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
    });

    port.start();
}