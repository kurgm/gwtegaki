export NODE_OPTIONS = --experimental-wasm-modules
NODE = node

# ordered to be used as arguments for build_feature.js
dataset_filenames = names.txt features.ann metadata.json

dataset_files = $(addprefix dataset/,$(dataset_filenames))

all: $(dataset_files)

$(dataset_files): dump_newest_only.txt | dataset
	$(NODE) build_feature.js $< $(dataset_files)

dataset:
	mkdir -p $@

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - $@

clean:
	-rm dump_newest_only.txt
	-rm -r dataset

.PHONY: all clean
