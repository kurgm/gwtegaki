package backend

import (
	"archive/tar"
	"bufio"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path"
	"strings"

	"cloud.google.com/go/storage"
	"github.com/yahoojapan/gongt"
)

var datasetInited = false

func getNGTIndex() (*gongt.NGT, error) {
	if !datasetInited {
		if err := loadDataset(); err != nil {
			return nil, err
		}
	}
	return gongt.Get(), nil
}

var _glyphlist []string

func getGlyphList() ([]string, error) {
	if !datasetInited {
		if err := loadDataset(); err != nil {
			return nil, err
		}
	}
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

	datasetInited = true
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

type tempDirDataset struct {
	path string
}

func (d *tempDirDataset) GetPath() string {
	return d.path
}
func (d *tempDirDataset) Cleanup() {
	os.RemoveAll(d.path)
}
func newTempDirDataset() *tempDirDataset {
	path, err := ioutil.TempDir("", "gwtegakibackend")
	if err != nil {
		log.Fatal(err)
	}
	return &tempDirDataset{path}
}

func openDataset() (dataset, error) {
	if path := os.Getenv("HWR_INDEX_PATH"); path != "" {
		return &localDirDataset{path}, nil
	}
	{
		bucketName := os.Getenv("INDEX_BUCKET_NAME")
		blobName := os.Getenv("INDEX_BLOB_NAME")
		if bucketName != "" && blobName != "" {
			ds := newTempDirDataset()
			if err := fetchGCSDataset(ds.path, bucketName, blobName); err != nil {
				return nil, err
			}
			return ds, nil
		}
	}
	return nil, errors.New("no dataset available")
}

func fetchGCSDataset(dirpath string, bucketName, blobName string) error {
	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("dataset download start")
	// ctx, cancel := context.WithTimeout(ctx, time.Second*50)
	// defer cancel()
	rc, err := client.Bucket(bucketName).Object(blobName).NewReader(ctx)
	// rc, err := os.Open("/Users/twe/repos/gwtegaki/model/dataset.tar.gz")
	if err != nil {
		return err
	}
	defer rc.Close()
	log.Println("dataset download complete")

	log.Printf("dataset extract start to %s", dirpath)
	tarStream, err := gzip.NewReader(rc)
	if err != nil {
		return err
	}
	tarReader := tar.NewReader(tarStream)

	for true {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		switch header.Typeflag {
		case tar.TypeDir:
			itempath, err := getExtractPath(dirpath, header.Name)
			if err != nil {
				return err
			}
			if err := os.Mkdir(itempath, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			itempath, err := getExtractPath(dirpath, header.Name)
			if err != nil {
				return err
			}
			outFile, err := os.Create(itempath)
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				return err
			}
			outFile.Close()

		default:
			return fmt.Errorf("unknown type in tar: %c in %s", header.Typeflag, header.Name)
		}
	}
	log.Println("dataset extract complete")
	return nil
}

func getExtractPath(dirpath, itempath string) (string, error) {
	if strings.Contains(itempath, "..") || strings.HasPrefix(itempath, "/") {
		return "", errors.New("invalid archive item name")
	}
	return path.Join(dirpath, itempath), nil
}
