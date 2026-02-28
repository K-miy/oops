.PHONY: build dev test test-rust test-wasm test-e2e clean install

# Compile Rust → WASM (release)
build:
	wasm-pack build --target web --out-dir web/pkg --release

# Compile Rust → WASM (debug) + serve
dev:
	wasm-pack build --target web --out-dir web/pkg
	@echo "Serving on http://localhost:8080"
	python3 -m http.server 8080 --directory web

# Install JS dependencies (Playwright)
install:
	npm install

# Unit tests Rust (fast, no browser needed)
test-rust:
	cargo test

# Integration tests WASM in headless browser
test-wasm:
	wasm-pack test --headless --firefox

# Unit tests JS (Node.js built-in, no browser needed)
test-js:
	node --test tests/js/*.mjs

# End-to-end tests
test-e2e:
	npx playwright test

# All tests
test: test-rust test-js test-e2e

clean:
	rm -rf web/pkg dist target node_modules
