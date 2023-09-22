
const keys = [
    "content",
    "scene_builder",
    "frame_builder",
    "render"
];

const block_colors = [
    "rgb(188, 80, 144)",
    "rgb(88, 80, 141)",
];

const block_borders = [
    "rgb(94, 40, 72)",
    "rgb(44, 40, 70)",
];

const SCALE = 10;
const TRACK_START_PX = 100;

// Return the desired start time for an event.
// If this function returns undefined, the event is canceled.
function scheduling_logic(key, time, history, settings) {

    return time;
}

var settings = {
    vsync_interval: 16.0,
    content: { snap_to_vsync: true, }
};

function add_block(key, evt_idx, t0, t1) {
    var blocks = document.getElementById("blocks");
    var block = document.createElement("div");
    block.classList.add("tl_block");
    block.classList.add(key);
    const start = t0 * SCALE;
    const length = (t1 - t0) * SCALE;
    block.style.left = TRACK_START_PX + start + "px";
    block.style.width = length + "px";
    block.style.backgroundColor = block_colors[evt_idx % block_colors.length];
    block.style.borderColor = block_borders[evt_idx % block_borders.length];
    blocks.appendChild(block);
}

function add_event_start_block(time, evt_idx) {
    var blocks = document.getElementById("blocks");
    var block = document.createElement("div");
    block.classList.add("event_start");
    block.style.left = TRACK_START_PX + time * SCALE - 5 + "px";
    block.style.backgroundColor = block_colors[evt_idx % block_colors.length];
    blocks.appendChild(block);
}

function add_track(key, track_idx, max_t) {
    var blocks = document.getElementById("blocks");

    const y = 100 + track_idx * 50;

    var track = document.createElement("div");
    track.classList.add("track");
    track.style.top = y + "px";
    track.style.width = TRACK_START_PX + max_t * SCALE + "px";
    const c = 200 + (track_idx % 2) * 20; 
    track.style.backgroundColor = "rgb(" + c + "," + c + ","+c+")";
    blocks.appendChild(track);

    var name_text = document.createTextNode(key);
    var name = document.createElement("div");
    name.classList.add("track_name");
    name.style.top = y + "px";
    blocks.appendChild(name);
    name.appendChild(name_text);
}

function add_vsync_bar(t) {
    var blocks = document.getElementById("blocks");
    var vsync = document.createElement("div");
    vsync.classList.add("vsync");
    vsync.style.left = TRACK_START_PX + (t * SCALE) + "px";
    blocks.appendChild(vsync);
}

function simulate(settings, timeline) {
    var current_time = {
        content: 0,
        scene_builder: 0,
        frame_builder: 0,
        render: 0,
    };

    let items = {};
    for (const key of keys) {
        items[key] = [];
    }

    var dropped_frames = 0;

    for (var evt_idx = 0; evt_idx < timeline.length; evt_idx++) {
        var evt = timeline[evt_idx];
        var t = evt.start;

        console.log("event " + evt_idx);

        for (const key of keys) {
            if (evt[key] != undefined) {
                var t0 = Math.max(t, current_time[key]);
                t0 = scheduling_logic(key, t0, items[key], settings);

                if (t0 == undefined) {
                    dropped_frames += 1;
                    break;
                }

                var t1 = t0 + evt[key];

                items[key].push({ evt_idx: evt_idx, t0: t0, t1: t1 });
                current_time[key] = t1;
                t = t1;
            }
        }
    }

    var max_t = 0;
    for (const key of keys) {
        max_t = Math.max(current_time[key], max_t);
    }

    var track_idx = 0;
    for (const key of keys) {
        console.log("--- " + key);

        add_track(key, track_idx, max_t);
        track_idx += 1;

        for (const item of items[key]) {
            console.log(item);
            add_block(key, item.evt_idx, item.t0, item.t1);
        }
    }

    var vsync_t = 0;
    while (vsync_t < max_t) {
        add_vsync_bar(vsync_t);
        vsync_t += settings.vsync_interval;
    }

    for (var evt_idx = 0; evt_idx < timeline.length; evt_idx++) {
        add_event_start_block(timeline[evt_idx].start, evt_idx);
    }
}

function run() {
    let text_area = document.getElementById("input");
    var timeline = JSON.parse(text_area.value);
    simulate(settings, timeline);
}

window.onload = (event) => { run() };
