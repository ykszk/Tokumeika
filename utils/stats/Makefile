.PHONY: clean

index.html: latest.xlsx
	python gen_html.py latest.xlsx index.html

latest.xlsx:
	python collect.py datadir latest.xlsx
