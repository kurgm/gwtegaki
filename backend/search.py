#!/usr/bin/env python3

from typing import List

import ngtpy


class NGTIndex(ngtpy.Index):
    def __del__(self):
        self.close()


def handle_query(index: NGTIndex, names: List[str], querystr: str):
    query = [float(val) for val in querystr.split()]

    size = 20

    result = index.search(query, size)
    return [(names[gid], dist) for gid, dist in result]


def read_names_list(filepath: str):
    with open(filepath) as namesf:
        return list(line.strip() for line in namesf)


def main():
    import json

    index = NGTIndex('../model/anng', read_only=True)
    names = read_names_list('../model/names.txt')
    while True:
        query = input()
        try:
            result = handle_query(index, names, query)
            resultstr = json.dumps(result, separators=(',', ':'))
            print(resultstr)
        except ValueError:
            print('error')


if __name__ == "__main__":
    main()
