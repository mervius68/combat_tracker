// The number that tells same-named creatures apart ("Goblin #2").
//
// Participants added from here on carry it in ct_tbl_participant.character_name.
// Participants added before that keep theirs in the numeric_value column, and the
// tracker renders both the same way, so everything here reads either scheme.
//
// The number is an identity, not a rank: it is assigned when the creature joins
// the encounter and never reassigned, so Goblin #5 may well act first.

const PARTICIPANT_NUMBER_PATTERN = /\s*#\s*(\d+)\s*$/;

// values the tracker has used over time to mean "this creature has no number"
function hasNoNumericValue(numericValue) {
    return (
        numericValue == null ||
        ["null", "0", 0].includes(numericValue) ||
        String(numericValue).trim() === ""
    );
}

// "Goblin #2" -> "Goblin". Only a trailing number is stripped, so a creature
// actually named "Guard #3 Post" keeps its name intact.
function baseCharacterName(name) {
    return String(name ?? "").replace(PARTICIPANT_NUMBER_PATTERN, "").trim();
}

function numberedCharacterName(baseName, number) {
    return `${baseName} #${number}`;
}

// Which number a participant already occupies, under either scheme. null if none.
function participantNumber(participant) {
    const fromName = String(participant?.character_name ?? "").match(PARTICIPANT_NUMBER_PATTERN);
    if (fromName) {
        return parseInt(fromName[1], 10);
    }
    if (!hasNoNumericValue(participant?.numeric_value)) {
        return parseInt(participant.numeric_value, 10) || null;
    }
    return null;
}

// The name as the tracker shows it, number and all. Both schemes again: a number
// already carried in the name comes back untouched, one left in the older column
// is appended.
function participantDisplayName(participant) {
    const name = String(participant?.character_name ?? "");
    if (hasNoNumericValue(participant?.numeric_value)) {
        return name;
    }
    return numberedCharacterName(name, participant.numeric_value);
}

// The next free number for a base name in this encounter.
//
// An existing unnumbered member counts as occupying #1, which is already how the
// tracker displays the first of a duplicate pair - several saved encounters hold
// e.g. "Nothic" alongside "Nothic #2".
function nextParticipantNumber(baseName, participants) {
    const group = (participants || []).filter(
        (participant) => baseCharacterName(participant.character_name) === baseName
    );
    if (!group.length) {
        return 1;
    }
    return group.reduce((highest, participant) => {
        return Math.max(highest, participantNumber(participant) || 1);
    }, 0) + 1;
}
