package backend

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func handleCors(w http.ResponseWriter, r *http.Request) bool {
	// Set CORS headers for the preflight request
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "3600")
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	// Set CORS headers for the main request.
	w.Header().Set("Access-Control-Allow-Origin", "*")
	return false
}

// HwrSearch receives query from the request and prints the result
// in the response body.
func HwrSearch(w http.ResponseWriter, r *http.Request) {
	if handleCors(w, r) {
		return
	}
	query := r.FormValue("query")
	if query == "" {
		http.Error(w, "parameter 'query' is missing", http.StatusBadRequest)
		return
	}
	log.Printf("query: %s", query)
	values, err := ParseQuery(query)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	result, err := HandleQuery(values)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.Write(jsonBytes)
}

// ParseQuery splits the input string into float64 slice.
func ParseQuery(querystr string) ([]float64, error) {
	valuestrs := strings.Fields(querystr)
	values := make([]float64, len(valuestrs))
	for i, valuestr := range valuestrs {
		value, err := strconv.ParseFloat(valuestr, 32)
		if err != nil {
			return nil, err
		}
		values[i] = value
	}
	return values, nil
}
