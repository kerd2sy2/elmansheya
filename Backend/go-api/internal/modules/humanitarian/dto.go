package humanitarian

type HumanitarianCaseDTO struct {
	ID                string `json:"id"`
	CaseTitle         string `json:"case_title"`
	NeedDescription   string `json:"need_description"`
	DonationDetails   string `json:"donation_details"`
	ResponsibleEntity string `json:"responsible_entity"`
}
