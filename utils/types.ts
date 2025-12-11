export type attendee = {
    email: string,
    displayName: string
}

export type EventData = {
    summary: string,
    start: {
        dateTime: string,
        timeZone: string
    },
    end: {
        dateTime: string,
        timeZone: string
    },
    attendees: attendee[]
}