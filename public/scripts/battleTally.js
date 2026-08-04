// The tally beneath the rounds: who landed the killing blows, and what
// ammunition the party does not get back.
//
// Everything here is derived from what load_encounter has already fetched, so the
// tally is rebuilt from scratch on every load and there is no stored score that
// could fall out of step with an edited or deleted action.
//
// KILL CREDIT
//   An opponent is any participant with pc = 0 - the same test the initiative
//   dropdown uses to tell combatants from the party. Anything the party summoned,
//   charmed or brought along is recorded that way too, so a companion's death can
//   show up here as an opponent's.
//   A drop is a ct_tbl_target row whose new_hp is 0 where that creature's previous
//   row was above 0. new_hp is a running total the server recalculates after every
//   edit, so what this reads is exactly what the HP column shows.
//   Only the creature's last drop counts, and only while its final new_hp is still
//   0. Heal it back above 0 and the credit disappears.
//
// AMMUNITION
//   A missed shot is an action with hit = 0 whose weapon spends ammunition. Half
//   of what missed, rounded up, is lost on the battlefield and comes off the
//   sheet; shots that hit are not counted.

// What each weapon spends. Tested in order, because every crossbow's name also
// contains "bow". Matched on the name rather than a column because the tool table
// records no ammunition or range of its own.
const AMMUNITION_WEAPONS = [
    { pattern: /crossbow/, singular: "bolt", plural: "bolts" },
    { pattern: /bow/, singular: "arrow", plural: "arrows" },
    { pattern: /sling/, singular: "bullet", plural: "bullets" },
    { pattern: /blowgun/, singular: "needle", plural: "needles" },
];

// ------------------------------------------------------------------- the tally

function battleTally(participants, actions, damageRows) {
    const roster = new Map((participants || []).map((participant) => [Number(participant.pID), participant]));
    const uniqueActions = actionsByAID(actions || []);
    const drops = killingBlows(roster, damageRows || [], uniqueActions);

    return {
        kills: creditByPlayer(participants || [], drops),
        // a drop nobody in the party can be credited with, e.g. one opponent
        // finishing off another, or a companion of the party's going down
        unclaimed: drops.filter((drop) => !isPlayerCharacter(drop.killer)),
        ammunition: ammunitionToRemove(roster, uniqueActions),
    };
}

// ct_tbl_action arrives joined to its conditions, which repeats an action that
// created more than one of them. Keyed by aID so a shot is never counted twice.
function actionsByAID(actions) {
    const unique = new Map();
    actions.forEach((action) => {
        if (action.aID != null && !unique.has(Number(action.aID))) {
            unique.set(Number(action.aID), action);
        }
    });
    return [...unique.values()];
}

function killingBlows(roster, damageRows, uniqueActions) {
    const timelines = new Map();
    damageRows.forEach((row) => {
        const victimPID = Number(row.target_pID);
        if (!timelines.has(victimPID)) {
            timelines.set(victimPID, []);
        }
        timelines.get(victimPID).push(row);
    });

    const actionForTarget = new Map();
    uniqueActions.forEach((action) => {
        const targetID = Number(action.targetID);
        if (action.targetID != null && action.targetID !== "" && !actionForTarget.has(targetID)) {
            actionForTarget.set(targetID, action);
        }
    });

    const drops = [];
    timelines.forEach((rows, victimPID) => {
        const victim = roster.get(victimPID);
        if (!victim || isPlayerCharacter(victim)) {
            return;
        }
        // tID is the order damage was dealt in; the round column is not, because a
        // hit can be recorded against the round the target next acts in
        rows.sort((a, b) => Number(a.tID) - Number(b.tID));

        // back above 0 by the end of the battle means it is not dead after all
        if (Number(rows[rows.length - 1].new_hp) > 0) {
            return;
        }

        let previousHP = Number(victim.starting_hp);
        let blow = null;
        rows.forEach((row) => {
            const newHP = Number(row.new_hp);
            if (previousHP > 0 && newHP <= 0) {
                blow = row; // a later drop supersedes this one
            }
            previousHP = newHP;
        });
        if (!blow) {
            return;
        }

        const action = actionForTarget.get(Number(blow.targetID));
        drops.push({
            victim,
            killer: roster.get(Number(blow.pID)) || null,
            method: methodUsed(action),
            // The action's round, not the target row's: a target row carries the
            // following round when the target acts before its attacker, since that
            // is where the tracker shows the resulting HP. The blow itself was
            // struck on the attacker's turn.
            round: action ? action.round : blow.round,
        });
    });
    return drops;
}

// The weapon or spell named on the action. Actions carry a tool, a free-text
// description, or the placeholders the action modal writes when neither was given.
function methodUsed(action) {
    if (!action) {
        return "";
    }
    return [action.toolName, action.action].find((name) => name && name !== "-" && name !== "none") || "";
}

// Every player character, so the tally reads as a scoreboard rather than only
// listing whoever happened to land a blow.
function creditByPlayer(participants, drops) {
    return participants
        .filter(isPlayerCharacter)
        .map((participant) => ({
            participant,
            credits: drops.filter((drop) => drop.killer === participant),
        }))
        .sort(
            (a, b) =>
                b.credits.length - a.credits.length ||
                String(a.participant.character_name).localeCompare(String(b.participant.character_name))
        );
}

// One entry per player per kind of ammunition: two crossbows draw on the same
// bolts, so the halving has to be done on the total rather than per weapon.
function ammunitionToRemove(roster, uniqueActions) {
    const spent = new Map();
    uniqueActions.forEach((action) => {
        if (Number(action.hit) !== 0) {
            return;
        }
        const shooter = roster.get(Number(action.pID));
        if (!isPlayerCharacter(shooter)) {
            return;
        }
        const weapon = methodUsed(action);
        const kind = AMMUNITION_WEAPONS.find((candidate) => candidate.pattern.test(weapon.toLowerCase()));
        if (!kind) {
            return;
        }
        const key = `${shooter.pID}|${kind.plural}`;
        if (!spent.has(key)) {
            spent.set(key, { participant: shooter, kind, missed: 0, weapons: new Set() });
        }
        const entry = spent.get(key);
        entry.missed += 1;
        entry.weapons.add(weapon);
    });

    return [...spent.values()].map((entry) => ({
        ...entry,
        weapons: [...entry.weapons],
        remove: Math.ceil(entry.missed / 2),
    }));
}

function isPlayerCharacter(participant) {
    return !!participant && Number(participant.pc) === 1;
}

// --------------------------------------------------------------------- display

// called at the end of load_encounter, alongside the rounds it summarises
function renderBattleTally(participants, actions, damageRows) {
    const container = document.querySelector(".ct_tally_container");
    if (!container) {
        return;
    }
    const tally = battleTally(participants, actions, damageRows);
    container.innerHTML = `
        <h2 class="ct_tally_heading">Tally</h2>
        <div class="ct_tally">
            ${killsPanel(tally)}
            ${ammunitionPanel(tally)}
        </div>`;
}

function killsPanel(tally) {
    const scoreboard = tally.kills.length
        ? `<div class="ct_tally_grid ct_tally_kills">
               <div class="ct_tally_cell header">Character</div>
               <div class="ct_tally_cell header center">Kills</div>
               <div class="ct_tally_cell header">Credited for</div>
               ${tally.kills.map(killsRow).join("")}
           </div>`
        : `<div class="ct_tally_empty">No player characters in this encounter.</div>`;

    const unclaimed = tally.unclaimed.length
        ? `<div class="ct_tally_note">Not credited to a player character:
               ${tally.unclaimed.map(unclaimedLabel).join("; ")}</div>`
        : "";

    return `<div class="ct_tally_panel">
                <h3>Killing Blows</h3>
                ${scoreboard}
                ${unclaimed}
            </div>`;
}

function killsRow(entry) {
    return `<div class="ct_tally_cell">${participantLabel(entry.participant)}</div>
            <div class="ct_tally_cell center">${entry.credits.length}</div>
            <div class="ct_tally_cell">${entry.credits.map(dropLabel).join("; ") || "&mdash;"}</div>`;
}

function dropLabel(drop) {
    return `${participantLabel(drop.victim)} <span class="ct_tally_aside">(${dropAside(drop)})</span>`;
}

// The same line for a drop the party cannot claim, which is only worth listing if
// it says who did land it.
function unclaimedLabel(drop) {
    const by = drop.killer ? `by ${participantLabel(drop.killer)}, ` : "";
    return `${participantLabel(drop.victim)} <span class="ct_tally_aside">(${by}${dropAside(drop)})</span>`;
}

function dropAside(drop) {
    const method = drop.method ? drop.method + ", " : "";
    return `${method}round ${drop.round}`;
}

function ammunitionPanel(tally) {
    const body = tally.ammunition.length
        ? `<div class="ct_tally_grid ct_tally_ammunition">
               <div class="ct_tally_cell header">Character</div>
               <div class="ct_tally_cell header">Ammunition</div>
               <div class="ct_tally_cell header center">Missed</div>
               <div class="ct_tally_cell header">Remove</div>
               ${tally.ammunition.map(ammunitionRow).join("")}
           </div>`
        : `<div class="ct_tally_empty">No missed shots to account for.</div>`;

    return `<div class="ct_tally_panel">
                <h3>Spent Ammunition</h3>
                ${body}
                <div class="ct_tally_note">Half of the ammunition that missed, rounded up, cannot be
                    recovered afterwards and comes off the sheet.</div>
            </div>`;
}

function ammunitionRow(entry) {
    const unit = entry.remove === 1 ? entry.kind.singular : entry.kind.plural;
    return `<div class="ct_tally_cell">${participantLabel(entry.participant)}</div>
            <div class="ct_tally_cell">${entry.kind.plural}
                <span class="ct_tally_aside">(${entry.weapons.join(", ")})</span></div>
            <div class="ct_tally_cell center">${entry.missed}</div>
            <div class="ct_tally_cell">${entry.remove} ${unit}</div>`;
}

// Names are stored with the number either in the name or in the numeric_value
// column, and the tracker shows both the same way. See participantNames.js.
function participantLabel(participant) {
    if (!participant) {
        return "unknown";
    }
    const number = hasNoNumericValue(participant.numeric_value) ? "" : " #" + participant.numeric_value;
    return participant.character_name + number;
}
