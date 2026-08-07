// The line beneath the encounter's title: when this combat kicked off, and when
// it was last worked on.
//
// Neither value is kept here. The server derives the start from the earliest
// action on record, so deleting a session's actions and opening the fight again
// on another day moves the start to that day - see the session timing block in
// app.js. This file only asks for the two timestamps and says them in the
// reader's own time zone, since they are stored in UTC.

// called from load_encounter, so the line is redrawn after every action, edit and
// deletion along with the rounds themselves
async function renderEncounterTiming(encounterID) {
    const container = document.querySelector(".encounter_timing");
    if (!container) {
        return;
    }
    if (!encounterID) {
        container.innerHTML = "";
        return;
    }

    let timing;
    try {
        timing = await dbQuery("GET", "encounterTiming/" + encounterID);
    } catch (err) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `${startedLabel(timing)}${updatedLabel(timing)}`;
}

function startedLabel(timing) {
    if (timing.started) {
        return timingEntry("Started", timing.started);
    }
    // No actions at all is a fight that has not begun; actions without a date are
    // older than the tracker's timekeeping, and saying so is better than dating
    // them from whenever they were last edited.
    const unknown = timing.actions
        ? "recorded before start times were kept"
        : "no actions recorded yet";
    return `<span class="encounter_timing_entry">Started
                <span class="encounter_timing_unknown">&mdash; ${unknown}</span></span>`;
}

function updatedLabel(timing) {
    if (!timing.updated) {
        return "";
    }
    return timingEntry("Last updated", timing.updated, true);
}

function timingEntry(label, timestamp, withRelative = false) {
    const when = new Date(timestamp);
    if (Number.isNaN(when.getTime())) {
        return "";
    }
    const relative = withRelative
        ? ` <span class="encounter_timing_aside">(${howLongAgo(when)})</span>`
        : "";
    return `<span class="encounter_timing_entry">${label}
                <b>${fullDate(when)}</b> at <b>${clockTime(when)}</b>${relative}</span>`;
}

function fullDate(when) {
    return when.toLocaleDateString([], {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function clockTime(when) {
    return when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Coarse on purpose: the exact date and time is already spelled out beside it,
// and what this adds is how stale the session is at a glance.
function howLongAgo(when) {
    const seconds = Math.round((Date.now() - when.getTime()) / 1000);
    if (seconds < 90) {
        return "just now";
    }
    const scales = [
        { unit: "minute", seconds: 60 },
        { unit: "hour", seconds: 60 * 60 },
        { unit: "day", seconds: 60 * 60 * 24 },
        { unit: "month", seconds: 60 * 60 * 24 * 30 },
        { unit: "year", seconds: 60 * 60 * 24 * 365 },
    ];
    // the largest scale the gap still reaches, so a gap of hours is said in hours
    // rather than in a hundred-odd minutes
    const scale = [...scales].reverse().find((candidate) => seconds >= candidate.seconds) || scales[0];
    const count = Math.round(seconds / scale.seconds);
    return `${count} ${scale.unit}${count === 1 ? "" : "s"} ago`;
}
