NODE = node

RS_DEBUG ?=

ifdef RS_DEBUG
	CARGO_BUILD_FLAGS =
	RS_TARGET_DIR = ../target/debug
else
	CARGO_BUILD_FLAGS = --release
	RS_TARGET_DIR = ../target/release
endif

RS_EXE = $(RS_TARGET_DIR)/gwtegaki-build_index

# ordered to be used as arguments for build_feature.js
dataset_filenames = names.txt features.ann metadata.json

dataset_files = $(addprefix dataset/,$(dataset_filenames))

all: $(dataset_files)

$(dataset_files): dump_newest_only.txt | dataset $(RS_EXE)
	$(RS_EXE) $< | $(NODE) build_feature.js $(dataset_files)

dataset:
	mkdir -p $@

$(RS_EXE):
	cargo build $(CARGO_BUILD_FLAGS)

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - $@

clean:
	-rm dump_newest_only.txt
	-rm -r dataset

.PHONY: all clean
