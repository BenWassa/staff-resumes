.PHONY: setup run build test clean

setup:
	python -m venv .venv
	.venv/bin/pip install -r requirements.txt
	cd web && npm install

run:
	cd web && npm run dev

build:
	cd web && npm run build

test:
	.venv/bin/pytest tests/ -v

clean:
	rm -rf outputs/*
