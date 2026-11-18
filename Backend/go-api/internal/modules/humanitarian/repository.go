package humanitarian

import "context"

type Repository interface {
	ListCases(ctx context.Context) ([]HumanitarianCaseDTO, error)
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListCases(ctx context.Context) ([]HumanitarianCaseDTO, error) {
	return []HumanitarianCaseDTO{
		{
			ID:                "hum-1",
			CaseTitle:         "تجهيز مستلزمات طبية لحالة حرجة بالقرية",
			NeedDescription:   "توفير جهاز تنفس منزلي وأدوية شهرية.",
			DonationDetails:   "التبرع المباشر بمقر الجمعية الشرعية بإيصال رسمي.",
			ResponsibleEntity: "لجنة الزكاة والجمعية الشرعية بالمنشية",
		},
	}, nil
}
