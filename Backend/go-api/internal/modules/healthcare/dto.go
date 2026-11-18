package healthcare

type MedicalEntityDTO struct {
	ID              string `json:"id"`
	EntityName      string `json:"entity_name"`
	ContactPhone    string `json:"contact_phone"`
	ScheduleText    string `json:"schedule_text"`
	ServicesOffered string `json:"services_offered"`
}
