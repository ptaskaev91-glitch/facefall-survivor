# Third-party notices

Facefall Survivor primarily contains original project code. Where a small compatible implementation is directly adapted from an external permissively licensed project, the source and license are recorded here.

## Web-Based First Person Shooter Engine (`ivanoskov/shooter`)

Source: `https://github.com/ivanoskov/shooter`

Used as a reference throughout the engine foundation. `src/physics/PlayerCapsule.ts` adapts portions of the capsule movement/collision-response approach from `src/core/Player.ts` (repository revision `70a7b9f7fc43d99db1e2833e0042b00da00d9cf0`). The implementation is modified for Facefall's fixed-step, camera-independent, mobile-first architecture.

MIT License

Copyright (c) 2024 Web-Based First Person Shooter Engine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
