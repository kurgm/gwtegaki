package backend

import (
	"errors"
	"log"

	"github.com/yahoojapan/gongt"
)

// SearchResult is an entry that contains the glyph name
// and the distance between the glyph and the query
type SearchResult struct {
	Name     string  `json:"name"`
	Distance float64 `json:"distance"`
}

// HandleQuery searches for the nearest glyphs to the given feature.
func HandleQuery(values []float64) ([]SearchResult, error) {
	index, err := getNGTIndex()
	if err != nil {
		log.Fatal(err)
	}
	if len(values) > index.GetDim() {
		return nil, errors.New("too many feature values")
	}
	if len(values) < index.GetDim() {
		values = append(values, make([]float64, index.GetDim()-len(values))...)
	}

	size := 20
	epsilon := gongt.DefaultEpsilon
	nresults, err := index.Search(values, size, epsilon)
	if err != nil {
		return nil, err
	}

	glist, err := getGlyphList()
	if err != nil {
		return nil, err
	}

	sresults := make([]SearchResult, len(nresults))
	for i, nresult := range nresults {
		sresults[i] = SearchResult{
			Name:     glist[nresult.ID-1],
			Distance: nresult.Distance,
		}
	}
	return sresults, nil
}
