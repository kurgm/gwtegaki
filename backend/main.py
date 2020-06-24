#!/usr/bin/env python3

import json
import functools
import os

from search import NGTIndex, handle_query, read_names_list


def cors_enabled(func):
    @functools.wraps(func)
    def wrapper(request):
        # For more information about CORS and CORS preflight requests, see
        # https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
        # for more information.

        # Set CORS headers for the preflight request
        if request.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }

            return ('', 204, headers)

        # Set CORS headers for the main request
        headers = {
            'Access-Control-Allow-Origin': '*'
        }

        result = func(request)
        if isinstance(result, tuple):
            assert len(result) == 3
            headers.update(result[2])
            return (result[0], result[1], headers)
        else:
            return (result, 200, headers)

    return wrapper


def load_dataset(datadirpath):
    index = NGTIndex(os.path.join(datadirpath, 'anng'), read_only=True)
    names_list = read_names_list(os.path.join(datadirpath, 'names.txt'))
    return index, names_list


if os.environ.get('HWR_INDEX_PATH'):
    index, names_list = load_dataset(os.environ.get('HWR_INDEX_PATH'))
else:
    from gcs import get_index_dir
    with get_index_dir() as indexdirpath:
        index, names_list = load_dataset(indexdirpath)


@cors_enabled
def hwr_search(request):
    query = request.values['query']
    try:
        result = handle_query(index, names_list, query)
    except ValueError:
        return ('invalid query', 400, {})

    resultstr = json.dumps(result, separators=(',', ':'))
    return (resultstr, 200, {'Content-Type': 'application/json'})


def main():
    from flask import Flask, request
    app = Flask(__name__)

    @app.route('/', methods=["GET", "POST", "OPTION"])
    def hwr_search_():
        return hwr_search(request)

    app.run(port=5000)


if __name__ == "__main__":
    main()
