
const STEPS = [
    "content",
    "scene_builder",
    "frame_builder",
    "render"
];

const BLOCK_COLORS = [
    "rgb(188, 80, 144)",
    "rgb(88, 80, 141)",
];

const BLOCK_BORDERS = [
    "rgb(94, 40, 72)",
    "rgb(44, 40, 70)",
];

const SCALE = 10;
const TRACK_START_PX = 100;

function snap_to_vsync(time, vsync_interval) {
    var m = time % vsync_interval;
    if (m == 0) {
        return time;
    }
    return time + vsync_interval - m;
}

// Return the desired start time for an event.
// If this function returns undefined, the event is canceled.
function scheduling_logic(step, time, history, settings) {

    return time;
}

var settings = {
    vsync_interval: 16.0,
    content: { snap_to_vsync: true, }
};

function add_block(step, evt_idx, t0, t1) {
    var blocks = document.getElementById("blocks");
    var block = document.createElement("div");
    block.classList.add("tl_block");
    block.classList.add(step);
    const start = t0 * SCALE;
    const length = (t1 - t0) * SCALE;
    block.style.left = TRACK_START_PX + start + "px";
    block.style.width = length + "px";
    block.style.backgroundColor = BLOCK_COLORS[evt_idx % BLOCK_COLORS.length];
    block.style.borderColor = BLOCK_BORDERS[evt_idx % BLOCK_BORDERS.length];
    blocks.appendChild(block);
}

function add_event_start_block(time, evt_idx) {
    var blocks = document.getElementById("blocks");
    var block = document.createElement("div");
    block.classList.add("event_start");
    block.style.left = TRACK_START_PX + time * SCALE - 5 + "px";
    block.style.backgroundColor = BLOCK_COLORS[evt_idx % BLOCK_COLORS.length];
    blocks.appendChild(block);
}

function add_track(step, track_idx, max_t) {
    var blocks = document.getElementById("blocks");

    const y = 10 + track_idx * 50;

    var track = document.createElement("div");
    track.classList.add("track");
    track.style.top = y + "px";
    track.style.width = TRACK_START_PX + max_t * SCALE + "px";
    const c = 200 + (track_idx % 2) * 20; 
    track.style.backgroundColor = "rgb(" + c + "," + c + ","+c+")";
    blocks.appendChild(track);

    var name_text = document.createTextNode(step);
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

function reset_view() {
    var blocks = document.getElementById("blocks");
    blocks.innerHTML = "";
}

function get_in_flight(time, events) {
    var idx = 0
    var prev = events[0];
    for (var event of events) {
        if (event.time > time) {
            return { event: prev, idx: idx };
        }

        prev = event;
        idx += 1;
    }

    return { event: prev, idx: idx - 1 };
}

function update_in_flight(add_or_sub, step, time, events) {
    var prev = get_in_flight(time, events);

    var event = {
        time: time,
        content: prev.event.content,
        scene_builder: prev.event.scene_builder,
        frame_builder: prev.event.frame_builder,
        render: prev.event.render,
        all: prev.event.all,
    };

    if (add_or_sub == "add") {
        event[step] += 1;
    } else if (add_or_sub == "sub") {
        event[step] -= 1;
    } else {
        console.log("unexepected parameter in update_in_flight");
    }

    events.splice(prev.idx, 0, event);
}

function simulate(settings, timeline, rules) {
    console.log("Run simulation");

    var current_time = {
        content: 0,
        scene_builder: 0,
        frame_builder: 0,
        render: 0,
    };

    var in_flight = [{
        time: 0,
        content: 0,
        scene_builder: 0,
        frame_builder: 0,
        render: 0,
        all: 0,
    }];

    let items = {};
    for (const step of STEPS) {
        items[step] = [];
    }

    var dropped_frames = 0;
    var next_content_frame = 0;

    for (var evt_idx = 0; evt_idx < timeline.length; evt_idx++) {
        var evt = timeline[evt_idx];
        var t = 0;

        update_in_flight("add", "all", t, in_flight);
        for (const step of STEPS) {
            if (evt[step] == undefined) {
                continue;
            }
            var history = items[step];
            var prev_start = undefined;
            if (history.length > 0) {
                prev_start = history[history.length - 1].t0;
            }
            if (step == "content") {
                t = next_content_frame;
            }

            var t0 = Math.max(t, current_time[step]);
            var sim = {
                //history: items[step],
                settings: settings,
                next_vsync: snap_to_vsync(t0, settings.vsync_interval),
                in_flight: get_in_flight(t0, in_flight),
                previous_start: prev_start,
                vsync_interval: settings.vsync_interval,
            };
            t0 = rules(step, t0, sim);

            if (t0 == undefined) {
                dropped_frames += 1;
                break;
            }

            var t1 = t0 + evt[step];

            update_in_flight("add", step, t0, in_flight);
            update_in_flight("sub", step, t1, in_flight);

            items[step].push({ evt_idx: evt_idx, t0: t0, t1: t1 });
            current_time[step] = t1;
            t = t1;

            if (step == "content") {
                // Target the vsync tick following the one that this started at.
                next_content_frame = t0 - (t0 % settings.vsync_interval) + settings.vsync_interval;     
            }
        }

        update_in_flight("sub", "all", t, in_flight);
    }

    var max_t = 0;
    for (const step of STEPS) {
        max_t = Math.max(current_time[step], max_t);
    }

    return {
        max_t: max_t,
        items: items,
    };
}

function update_view(settings, simulation, timeline) {
    reset_view();

    var track_idx = 0;
    for (const step of STEPS) {
        add_track(step, track_idx, simulation.max_t);
        track_idx += 1;

        for (const item of simulation.items[step]) {
            add_block(step, item.evt_idx, item.t0, item.t1);
        }
    }

    var vsync_t = 0;
    while (vsync_t < simulation.max_t) {
        add_vsync_bar(vsync_t);
        vsync_t += settings.vsync_interval;
    }

    //for (var evt_idx = 0; evt_idx < timeline.length; evt_idx++) {
    //    add_event_start_block(timeline[evt_idx].start, evt_idx);
    //}
}


function run() {
    var input_text_area = document.getElementById("input");
    var timeline = JSON.parse(input_text_area.value);

    var rules_text_area = document.getElementById("rules");
    rules_src = "function logic(step, time, ctx) {" + rules_text_area.value + "}";
    eval(rules_src);

    const sim = simulate(settings, timeline, logic);
    update_view(settings, sim, timeline);
}

window.onload = (event) => { run() };
