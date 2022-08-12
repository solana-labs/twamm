SHELL:=bash

deploy-app:
	cd app && npx vercel

import-program-production:
	anchor idl fetch $$PROGRAM_ADDRESS > ./app/src/idl.json;

import-program:
	cp target/idl/twamm.json app/src/idl.json

start-app:
	cd app && yarn dev

start-app-production:
	cd app && yarn run build && yarn start

start-docs:
	cd app && mdbook serve docs
