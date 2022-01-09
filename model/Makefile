NODE = node

all: dataset.tar.gz

dataset.tar.gz: features.ann
	tar czvf $@ $^ names.txt

features.ann: dump_newest_only.txt
	$(NODE) build_feature.js $< names.txt $@

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - $@

clean:
	-rm dump_newest_only.txt
	-rm features.ann names.txt
	-rm dataset.tar.gz

.PHONY: all clean
