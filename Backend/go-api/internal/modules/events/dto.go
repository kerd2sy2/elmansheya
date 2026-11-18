package events

type EventDTO struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	EventType    string  `json:"event_type"`
	EventDate    string  `json:"event_date"`
	EventTime    string  `json:"event_time"`
	LocationName string  `json:"location_name"`
	Latitude     float64 `json:"latitude,omitempty"`
	Longitude    float64 `json:"longitude,omitempty"`
}
