package main

import (
	"net/http"

	gwtegakibackend "github.com/kurgm/gwtegaki/backend"
)

func main() {
	http.HandleFunc("/", gwtegakibackend.HwrSearch)
	http.ListenAndServe(":5000", nil)
}
