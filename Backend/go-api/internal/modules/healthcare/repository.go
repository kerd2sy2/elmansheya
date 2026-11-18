package healthcare

import "context"

type Repository interface {
	ListMedicalEntities(ctx context.Context) ([]MedicalEntityDTO, error)
}

type postgresRepository struct{}

func NewRepository() Repository { return &postgresRepository{} }

func (r *postgresRepository) ListMedicalEntities(ctx context.Context) ([]MedicalEntityDTO, error) {
	return []MedicalEntityDTO{
		{
			ID:              "med-1",
			EntityName:      "الوحدة الصحية بالمنشية",
			ContactPhone:    "123",
			ScheduleText:    "يومياً على مدار 24 ساعة للطوارئ",
			ServicesOffered: "إسعافات أولية، تطعيمات، كشف باطنة وأطفال.",
		},
	}, nil
}
