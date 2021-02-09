package main

import (
	"bufio"
	"errors"
	"log"
	"os"
	"path"
	"sync"

	"github.com/yahoojapan/gongt"
)

var datasetLoadOnce sync.Once

func ensureDatasetInitialized() {
	datasetLoadOnce.Do(func() {
		err := loadDataset()
		if err != nil {
			log.Fatal(err)
		}
	})
}

func getNGTIndex() (*gongt.NGT, error) {
	ensureDatasetInitialized()
	return gongt.Get(), nil
}

var _glyphlist []string

func getGlyphList() ([]string, error) {
	ensureDatasetInitialized()
	return _glyphlist, nil
}

type dataset interface {
	GetPath() string
	Cleanup()
}

func loadDataset() error {
	ds, err := openDataset()
	if err != nil {
		return err
	}
	defer ds.Cleanup()

	log.Println("loading dataset")
	gongt.Get().SetIndexPath(path.Join(ds.GetPath(), "anng")).Open()
	if errs := gongt.GetErrors(); len(errs) > 0 {
		return errs[0]
	}
	log.Println("ngt graph loaded")

	if err := loadGlyphList(path.Join(ds.GetPath(), "names.txt")); err != nil {
		return err
	}
	log.Println("glyph list loaded")

	return nil
}

func loadGlyphList(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	glyphlist := make([]string, 0, 300000)
	for scanner.Scan() {
		line := scanner.Text()
		glyphlist = append(glyphlist, line)
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	_glyphlist = glyphlist
	return nil
}

type localDirDataset struct {
	path string
}

func (d *localDirDataset) GetPath() string {
	return d.path
}
func (d *localDirDataset) Cleanup() {
}

func openDataset() (dataset, error) {
	if path := os.Getenv("HWR_INDEX_PATH"); path != "" {
		return &localDirDataset{path}, nil
	}
	return nil, errors.New("no dataset available")
}
