NODE = node

all: dataset.tar.gz

dataset.tar.gz: anng
	tar czvf $@ $^ names.txt

anng: features.txt
	-rm -r $@
	ngt create -d `$(NODE) -p 'require("../model/feature").FEATURE_COLSIZE'` $@ $<

features.txt: dump_newest_only.txt
	$(NODE) build_feature.js $< names.txt $@

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - $@

clean:
	-rm dump_newest_only.txt
	-rm features.txt names.txt
	-rm -r anng
	-rm dataset.tar.gz

.PHONY: all clean
