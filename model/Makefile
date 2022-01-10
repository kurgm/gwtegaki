NODE = node

# ordered to be used as arguments for build_feature.js
dataset_files = names.txt features.ann metadata.json

all: dataset.tar.gz

dataset.tar.gz: $(dataset_files)
	tar czvf $@ $^

$(dataset_files): dump_newest_only.txt
	$(NODE) build_feature.js $< $(dataset_files)

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - $@

clean:
	-rm dump_newest_only.txt
	-rm $(dataset_files)
	-rm dataset.tar.gz

.PHONY: all clean
