let dataPeer = new Peer();
let videoPeer = new Peer();

let dataConnection;
let call;

const app = new Vue({
    el: '#app',
    data: {
        peerID: '',
        role: 'creator',
        videoURL: '',
        state: 'waiting',
        localPlaying: false,
        remotePlaying: false,
    },
    computed: {
        shareURL() {
            return window.location.href + '#' + this.peerID;
        },
    },
    methods: {
        fileChanged(event) {
            const file = event.target.files[0];
            this.videoURL = URL.createObjectURL(file);

            this.createRoom();
        },
        createRoom() {
            this.peerID = genID();
            dataPeer = new Peer('creator-' + this.peerID + '-data');
            dataPeer.on('connection', (conn) => {
                dataConnection = conn;
                dataConnection.on('data', receiveData);
            });
        },
        promptFile() {
            document.getElementById("file").click();
        },
        shareBoxClick(event) {
            event.target.select();
        },
        dataHandler(data) {
            if (this.role == 'creator' && data == 'connected') {
                this.streamToRemote();
            }
        },
        streamToRemote() {
            this.localPlaying = true;

            Vue.nextTick(() => {
                var playbackElement = document.getElementById("local");
                var captureStream = playbackElement.captureStream();
                call = videoPeer.call('receiver-' + this.peerID + '-video', captureStream);
            });
        },
    },
    mounted: function() {
        const hashbang = parseHashbang();
        if (hashbang != "") {
            this.role = 'receiver';
            this.peerID = hashbang;

            dataPeer = new Peer('receiver-' + this.peerID + '-data');
            videoPeer = new Peer('receiver-' + this.peerID + '-video');
            
            // Dial back to the creator.
            dataPeer.on('open', () => {
                dataConnection = dataPeer.connect('creator-' + this.peerID + '-data');
                dataConnection.on('open', () => {
                    dataConnection.on('data', receiveData);
                    dataConnection.send('connected');
                });
            });

            videoPeer.on('call', (call) => {
                setTimeout(() => {
                    call.answer();
                    call.on('stream', (remoteStream) => {
                        this.remotePlaying = true;
                        Vue.nextTick(() => {
                            document.getElementById("remote").srcObject = remoteStream;
                        });
                    });
                }, 1000);
            });
        }
    },
});

function receiveData(data) {
    console.log('[DataPeer] Received:', data);
    app.dataHandler(data);
}
