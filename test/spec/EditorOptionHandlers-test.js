/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, describe, beforeEach, afterEach, it, runs, waitsFor, expect, brackets, waitsForDone */

define(function (require, exports, module) {
    "use strict";
    
    // Load dependent modules
    var CommandManager,      // loaded from brackets.test
        Commands,            // loaded from brackets.test
        EditorManager,       // loaded from brackets.test
        DocumentManager,     // loaded from brackets.test
        FileViewController,
        SpecRunnerUtils     = require("spec/SpecRunnerUtils");
    
    
    describe("EditorOptionHandlers", function () {
        this.category = "integration";
        
        var testPath = SpecRunnerUtils.getTestPath("/spec/EditorOptionHandlers-test-files"),
            testWindow,
            editor = null;
        
        var CSS_FILE  = testPath + "/test.css",
            HTML_FILE = testPath + "/test.html",
            JS_FILE   = testPath + "/test.js";
        
        var OPEN_BRACKET  = 91,
            CLOSE_BRACKET = 93,
            SINGLE_QUOTE  = 39,
            BACKSPACE     = 8;
        
        
        beforeEach(function () {
            SpecRunnerUtils.createTestWindowAndRun(this, function (w) {
                testWindow = w;

                // Load module instances from brackets.test
                CommandManager      = testWindow.brackets.test.CommandManager;
                Commands            = testWindow.brackets.test.Commands;
                EditorManager       = testWindow.brackets.test.EditorManager;
                DocumentManager     = testWindow.brackets.test.DocumentManager;
                FileViewController  = testWindow.brackets.test.FileViewController;
               
                SpecRunnerUtils.loadProjectInTestWindow(testPath);
            });
        });

        afterEach(function () {
            SpecRunnerUtils.closeTestWindow();
            editor = null;
        });
        
        
        function checkLineWrapping(firstPos, secondPos, shouldWrap) {
            runs(function () {
                var firstLineBottom, nextLineBottom;
                
                expect(editor).toBeTruthy();

                editor.setCursorPos(firstPos);
                firstLineBottom = editor._codeMirror.cursorCoords(null, "local").bottom;

                editor.setCursorPos(secondPos);
                nextLineBottom = editor._codeMirror.cursorCoords(null, "local").bottom;
                
                if (shouldWrap) {
                    expect(firstLineBottom).toBeLessThan(nextLineBottom);
                } else {
                    expect(firstLineBottom).toEqual(nextLineBottom);
                }
            });
        }
        
        function checkActiveLine(line, shouldShow) {
            runs(function () {
                var lineInfo;
                
                expect(editor).toBeTruthy();
                editor.setCursorPos({line: line, ch: 0});
                lineInfo = editor._codeMirror.lineInfo(line);
                
                if (shouldShow) {
                    expect(lineInfo.wrapClass).toBe("CodeMirror-activeline");
                } else {
                    expect(lineInfo.wrapClass).toBeUndefined();
                }
            });
        }
        
        function checkLineNumbers(shouldShow) {
            runs(function () {
                var gutterElement, $lineNumbers;
                
                expect(editor).toBeTruthy();
                gutterElement = editor._codeMirror.getGutterElement();
                $lineNumbers = $(gutterElement).find(".CodeMirror-linenumbers");
                
                if (shouldShow) {
                    expect($lineNumbers.length).toNotBe(0);
                } else {
                    expect($lineNumbers.length).toBe(0);
                }
            });
        }
        
        function checkCloseBraces(startSel, endSel, keyCode, expectedText) {
            runs(function () {
                var input, line;
                
                expect(editor).toBeTruthy();
                input = editor._codeMirror.getInputField();
                
                if (endSel) {
                    editor.setSelection(startSel, endSel);
                } else {
                    editor.setCursorPos(startSel);
                }
                
                SpecRunnerUtils.simulateKeyEvent(keyCode, keyCode === BACKSPACE ? "keydown" : "keypress", input);
                
                line = editor._codeMirror.getLine(startSel.line);
                expect(line).toBe(expectedText);
            });
        }
        
        
        // Helper functions to open editors / toggle options
        function openEditor(fullPath) {
            runs(function () {
                var promise = CommandManager.execute(Commands.FILE_ADD_TO_WORKING_SET, {fullPath: fullPath});
                waitsForDone(promise, "Open into working set");
            });
            
            runs(function () {
                editor = EditorManager.getCurrentFullEditor();
            });
        }
        
        function openAnotherEditor(fullpath) {
            runs(function () {
                // Open another document and bring it to the front
                waitsForDone(FileViewController.openAndSelectDocument(fullpath, FileViewController.PROJECT_MANAGER),
                             "FILE_OPEN on file timeout", 1000);
            });
            
            runs(function () {
                editor = EditorManager.getCurrentFullEditor();
            });
        }
        
        function openInlineEditor(toggleEditorAt) {
            toggleEditorAt = toggleEditorAt || {line: 8, ch: 11};
            openEditor(HTML_FILE);
            
            runs(function () {
                // Open inline editor onto test.css's ".testClass" rule
                var promise = SpecRunnerUtils.toggleQuickEditAtOffset(EditorManager.getCurrentFullEditor(), toggleEditorAt);
                waitsForDone(promise, "Open inline editor");
            });
            
            runs(function () {
                editor = EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editors[0];
            });
        }
        
        function toggleOption(commandID, text) {
            runs(function () {
                var promise = CommandManager.execute(commandID);
                waitsForDone(promise, text);
            });
        }

        
        describe("Toggle Word Wrap", function () {
            it("should wrap long lines in main editor by default", function () {
                openEditor(HTML_FILE);
                
                // Use two cursor positions to detect line wrapping. First position at 
                // the beginning of a long line and the second position to be
                // somewhere on the long line that will be part of an extra line 
                // created by word-wrap and get its bottom coordinate.
                checkLineWrapping({line: 8, ch: 0}, {line: 8, ch: 210}, true);
            });
    
            it("should also wrap long lines in inline editor by default", function () {
                openInlineEditor();
                checkLineWrapping({line: 0, ch: 0}, {line: 0, ch: 160}, true);
            });
            
            it("should NOT wrap the long lines after turning off word-wrap", function () {
                // Turn off word-wrap
                toggleOption(Commands.TOGGLE_WORD_WRAP, "Toggle word-wrap");
                
                openEditor(CSS_FILE);
                checkLineWrapping({line: 0, ch: 1}, {line: 0, ch: 180}, false);
            });
    
            it("should NOT wrap the long lines in another document when word-wrap off", function () {
                openEditor(CSS_FILE);
                
                // Turn off word-wrap
                toggleOption(Commands.TOGGLE_WORD_WRAP, "Toggle word-wrap");
                
                openAnotherEditor(HTML_FILE);
                checkLineWrapping({line: 8, ch: 0}, {line: 8, ch: 210}, false);
            });
        });
        
        
        describe("Toggle Active Line", function () {
            it("should NOT show active line in main editor by default", function () {
                openEditor(HTML_FILE);
                checkActiveLine(5, false);
            });
            
            it("should NOT show active line in inline editor by default", function () {
                openInlineEditor();
                checkActiveLine(0, false);
            });
            
            it("should style active line after turning it on", function () {
                // Turn on show active line
                toggleOption(Commands.TOGGLE_ACTIVE_LINE, "Toggle active line");
                
                openEditor(CSS_FILE);
                checkActiveLine(0, true);
            });
            
            it("should style the active line when opening another document with show active line on", function () {
                openEditor(CSS_FILE);
                
                // Turn on show active line
                toggleOption(Commands.TOGGLE_ACTIVE_LINE, "Toggle active line");
                
                openAnotherEditor(HTML_FILE);
                checkActiveLine(3, true);
            });
        });
        
        
        describe("Toggle Line Numbers", function () {
            it("should show line numbers in main editor by default", function () {
                openEditor(HTML_FILE);
                checkLineNumbers(true);
            });
            
            it("should also show line numbers in inline editor by default", function () {
                openInlineEditor();
                checkLineNumbers(true);
            });
            
            it("should NOT show line numbers in main editor after turning it off", function () {
                // Turn off show line numbers
                toggleOption(Commands.TOGGLE_LINE_NUMBERS, "Toggle line numbers");
                
                openEditor(CSS_FILE);
                checkLineNumbers(false);
            });
            
            it("should NOT show line numbers in inline editor after turning it off", function () {
                // Turn off show line numbers
                toggleOption(Commands.TOGGLE_LINE_NUMBERS, "Toggle line numbers");
                
                openInlineEditor();
                checkLineNumbers(false);
            });
            
            it("should NOT show line numbers when opening another document with show line numbers off", function () {
                openEditor(CSS_FILE);
                
                // Turn off show line numbers
                toggleOption(Commands.TOGGLE_LINE_NUMBERS, "Toggle line numbers");
                
                openAnotherEditor(HTML_FILE);
                checkLineNumbers(false);
            });
        });
        
        
        describe("Toggle Auto Close Braces", function () {
            it("should NOT auto close braces in main editor by default", function () {
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 35}, null, OPEN_BRACKET, "var myContent = \"This is awesome!\";");
            });
            
            it("should NOT auto close braces in inline editor by default", function () {
                openInlineEditor({line: 9, ch: 11});
                checkCloseBraces({line: 1, ch: 15}, null, OPEN_BRACKET, ".shortLineClass { color: red; }");
            });
            
            it("should auto close braces in the main editor after turning it on", function () {
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 35}, null, OPEN_BRACKET, "var myContent = \"This is awesome!\";[]");
            });
            
            it("should auto close braces in inline editor after turning it on", function () {
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openInlineEditor({line: 9, ch: 11});
                checkCloseBraces({line: 1, ch: 32}, null, OPEN_BRACKET, ".shortLineClass { color: red; }[]");
            });
            
            it("should auto close braces when opening another document with auto close braces on", function () {
                openEditor(CSS_FILE);
                
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openAnotherEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 35}, null, OPEN_BRACKET, "var myContent = \"This is awesome!\";[]");
            });
            
            it("should only auto close braces before spaces, closing braces or end of lines", function () {
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close brackets");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 0}, null, OPEN_BRACKET, "var myContent = \"This is awesome!\";");
                checkCloseBraces({line: 0, ch: 15}, null, OPEN_BRACKET, "var myContent =[] \"This is awesome!\";");
                checkCloseBraces({line: 0, ch: 16}, null, OPEN_BRACKET, "var myContent =[[]] \"This is awesome!\";");
                checkCloseBraces({line: 0, ch: 39}, null, OPEN_BRACKET, "var myContent =[[]] \"This is awesome!\";[]");
            });
            
            it("should overwrite a close brace when writing a close brace before the same close brace", function () {
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 15}, null, OPEN_BRACKET, "var myContent =[] \"This is awesome!\";");
                
                checkCloseBraces({line: 0, ch: 16}, null, CLOSE_BRACKET, "var myContent =[] \"This is awesome!\";");
                runs(function () {
                    expect(editor.getCursorPos()).toEqual({line: 0, ch: 17});
                });
            });
            
            it("should wrap a selection between braces", function () {
                // Turn on auto close braces
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 16}, {line: 0, ch: 34}, OPEN_BRACKET, "var myContent = [\"This is awesome!\"];");
                
                runs(function () {
                    expect(editor.getSelection()).toEqual({start: {line: 0, ch: 16}, end: {line: 0, ch: 36}});
                });
            });
            
            it("should delete both open and close braces when both are together and backspacing", function () {
                // Turn on auto close brackets
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 15}, null, OPEN_BRACKET, "var myContent =[] \"This is awesome!\";");
                checkCloseBraces({line: 0, ch: 16}, null, BACKSPACE, "var myContent = \"This is awesome!\";");
            });
            
            it("should NOT auto close single quotes inside comments", function () {
                // Turn on auto close brackets
                toggleOption(Commands.TOGGLE_CLOSE_BRACKETS, "Toggle auto close braces");
                
                openEditor(JS_FILE);
                checkCloseBraces({line: 0, ch: 15}, null, SINGLE_QUOTE, "var myContent ='' \"This is awesome!\";");
                checkCloseBraces({line: 1, ch: 7}, null, SINGLE_QUOTE, "// Yes, it is!");
            });
        });
    });
});
