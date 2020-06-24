#!/usr/bin/env python3

import json
import logging
import functools

from search import handle_query
from dataset import get_dataset


logging.basicConfig(level=logging.DEBUG)


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


@cors_enabled
def hwr_search(request):
    index, names_list = get_dataset()
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
