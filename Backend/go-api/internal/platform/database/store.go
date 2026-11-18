package database

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// PersistentFileStore يحفظ البيانات الحقيقية فعلياً على القرص الصلب بصيغة JSON ذرية (Atomic Write)
// بحيث لا توجد أي بيانات وهمية، وكل ما يتم إدخاله يُحفظ بشكل دائم حتى بعد إعادة تشغيل السيرفر.
type PersistentFileStore struct {
	mu       sync.RWMutex
	filePath string
}

func NewPersistentFileStore(filename string) *PersistentFileStore {
	dir := filepath.Join(".", "data")
	_ = os.MkdirAll(dir, 0755)
	return &PersistentFileStore{
		filePath: filepath.Join(dir, filename),
	}
}

func (s *PersistentFileStore) Load(target interface{}) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	bytes, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if len(bytes) == 0 {
		return nil
	}
	return json.Unmarshal(bytes, target)
}

func (s *PersistentFileStore) Save(data interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := s.filePath + ".tmp"
	if err := os.WriteFile(tmpPath, bytes, 0600); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.filePath)
}
