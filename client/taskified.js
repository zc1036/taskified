
function markdown(text) {
    return DOMPurify.sanitize(marked(text))
}

function datesEqual(a, b) {
    return (a.year == b.year
            && a.month == b.month
            && a.day == b.day
            && a.hour == b.hour
            && a.minute == b.minute);
}

function formatDate(date) {
    var today = new Date()

    var td = new Date(
        date.year,
        date.month,
        date.day,
        date.hour,
        date.minute
    )

    var datediff = today.getDate() - td.getDate()
    if (td.getFullYear() == today.getFullYear()) {
        if (td.getMonth() == today.getMonth()
            && (datediff <= 1))
        {
            var hour = date.hour % 12
            var ampm = date.hour >= 12 ? 'pm' : 'am';

            if (hour == 0) {
                hour = '12'
            }
            var suffix = ''
            var prefix = ''
            if (datediff == 1) {
                prefix = ' yest.'
            } else if (datediff > 0 && datediff < 7) {
                prefix = td.toLocaleString('en-us', { weekday: 'long' }) + ', '
            }
            return prefix + hour + ':' + (date.minute.toString().padStart(2, '0')) + ' ' + ampm + suffix
        } else if (td.getMonth() == today.getMonth() &&
                   datediff < 7)
        {
            return td.toLocaleString('en-us', { weekday: 'long' })
        } else {
            return td.getMonth() + '/' + td.getMonth()
        }
    }

    return '' + (date.month + 1) + '/' + date.day + '/' + date.year
}

function makeJsonFromDate(date) {
    return {
        minute: date.getMinutes(),
        hour: date.getHours(),
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear()
    }
}

function setModDate(todo, date) {
    todo.modDate = makeJsonFromDate(date)
}

function setCreateDate(todo, date) {
    todo.createDate = makeJsonFromDate(date)
}

function rendertodo(todo) {
    todo.rendered = markdown(todo.original)
}

function maketodo() {
    var date = new Date()

    var todo = {
        status: '',
        original: '*Markdown yo*',
        rendered: '',
        modified: false,
        createDate: null,
        modDate: null,
        uid: Math.random().toString(36).substring(2, 15)
    }

    rendertodo(todo)

    setCreateDate(todo, date)

    return todo
}

function setTodoStatus(a) {
    this.getSelectedTodos().forEach(todo => todo.status = a.text)
}

// This component mostly taken from https://megalomaniacslair.co.uk/pairing-simplemde-and-vuejs/
Vue.component('simplemde', {
    props: ['value'],
    template: `
       <textarea ref="area"></textarea>
    `,
    mounted() {
        this.mde = new SimpleMDE({ element: this.$refs.area,
                                   shortcuts: { },
                                   autofocus: true,
                                   toolbar: false,
                                   spellChecker: false,
                                   status: false })
        this.mde.value(this.value)
        this.mde.codemirror.on('changes', () => {
            if (this.value != this.mde.value()) {
                this.$emit('input', this.mde.value())
            }
        })
    },
    watch: {
        // Setup a watch to track changes,
        // and only update when changes are made
        value(newVal) {
            this.$emit('notify', newVal)
            if (newVal != this.mde.value()) {
                this.mde.value(newVal)
            }
        }
    },
    beforeDestroy() {
        // Clean up when the component gets destroyed

        // NOTE: Uncommenting this causes an error when you delete a
        // TODO that is located in the list BEFORE/ABOVE the todo being
        // edited.

        //this.mde.toTextArea()
    }
})

var app = new Vue({
    el: '#app-container',
    data: {
        state: {
            documentTitle: 'New document',
            todos: [ maketodo() ],
            deletedTodos: [ ],
            lastSaveDate: null,
            setStateShortcuts: [
                { shortcut: 's',
                  text: '',
                  pretty: '[clear]' },
                { shortcut: 'c',
                  text: '✓' },
                { shortcut: 'C',
                  text: '✗' },
                { shortcut: 't',
                  text: '☐' },
                { shortcut: 'T',
                  text: '☑' },
                { shortcut: 'f',
                  text: '➡' },
                { shortcut: 'b',
                  text: '⇨' },
                { shortcut: 'i',
                  text: 'ⓘ' },
                { shortcut: 'w',
                  text: '⚠' },
                { shortcut: 'x',
                  text: '☒' },
            ]
        },
        selectedTodos: {},
        editableTodos: {},
        editingTodoText: {},
        activeStatusShortcuts: [ ],
        activeStatusShortcutCallback: null,
        activeContexts: [ ],
        changed: false,
        saving: false,
        showControlPanel: false
    },
    methods: {
        savetext() {
            if (this.saving) {
                return 'saving...'
            } else if (this.state.lastSaveDate) {
                return 'saved ' + formatDate(this.state.lastSaveDate)
            } else {
                return 'unsaved'
            }
        },

        swapTodos(idx1, idx2) {
            var old = this.state.todos[idx1]
            this.state.todos.splice(idx1, 1, this.state.todos[idx2])
            this.state.todos.splice(idx2, 1, old)
        },

        moveTodosUp(selected) {
            // Do not shift a group that has nowhere to go (up or down)
            if (selected.length > 0) {
                if (this.getTodoIdx(selected[0]) == 0)
                {
                    return
                }
            }

            selected.forEach((todo) => {
                var idx = this.getTodoIdx(todo)

                this.swapTodos(idx - 1, idx)
            })
        },

        moveTodosDown(selected) {
            // Do not shift a group that has nowhere to go (up or down)
            if (selected.length > 0) {
                if ((this.getTodoIdx(selected[selected.length - 1])
                     == this.state.todos.length - 1))
                {
                    return
                }
            }

            selected.slice().reverse().forEach((todo) => {
                var idx = this.getTodoIdx(todo)

                this.swapTodos(idx + 1, idx)
            })
        },

        makeDocTitleEditable() {
            this.$refs.docTitle.contentEditable = true
        },

        startUpdatingDocTitle() {
            this.activeContexts.push((e) => e.stopPropagation())
        },

        updateDocumentTitle(t) {
            this.activeContexts.pop()
            if (this.state.documentTitle.trim() != this.$refs.docTitle.innerText.trim()) {
                this.state.documentTitle = this.$refs.docTitle.innerText.trim()
            }
            this.$refs.docTitle.contentEditable = false
        },

        formatDate(d) {
            return formatDate(d)
        },

        getSelectedTodos() {
            return this.state.todos.filter(todo => this.selectedTodos[todo.uid])
        },

        saveState() {
            if (this.saving) {
                alert('already saving')
                return
            }

            this.state.todos.filter(todo => this.editableTodos[todo.uid]).forEach(rendertodo)

            var oldLastSaveDate = this.state.lastSaveDate

            this.saving = true
            this.state.lastSaveDate = makeJsonFromDate(new Date())

						axios.post(window.location.pathname + '?save',
                       {
                           state: this.state
                       }).then(() => {
                                   this.saving = false
                                   this.changed = false
                               },
                               e => {
                                   this.state.lastSaveDate = oldLastSaveDate
                                   this.saving = false
                                   alert('Error saving; see console')
                                   console.log(e)
                                   console.log({e})
                               })

            var savestring = JSON.stringify(this.state)
            window.localStorage.setItem(window.location.pathname + '_savestate', savestring)

            /*
            var blob = new Blob([savestring], {type: "text/plain;charset=utf-8"})
            saveAs(blob, this.state.documentTitle + ".json")
            */
        },

        loadStateFromLocalStorage() {
            var state = window.localStorage.getItem(window.location.pathname + '_savestate')

            if (state) {
                this.state = JSON.parse(state)
            }

            this.postLoadState()
        },

        loadStateFromJson(json) {
            if (json.length > 0) {
                this.state = JSON.parse(json).state
            }

            this.postLoadState()
        },

        postLoadState() {
            this.clearSelection()
            Vue.nextTick(() => {
                this.changed = false
            })
        },

        getTodoFromIdx(i) {
            var last = null
            var first = null
            if (this.state.todos.length > 0) {
                first = this.state.todos[0]
                last = this.state.todos[this.state.todos.length - 1]
            }

            if (i < 0) {
                return first
            }

            if (i >= this.state.todos.length) {
                return last
            }

            return this.state.todos[i]
        },

        getTodoIdx(todo) {
            for (var i = 0; i < this.state.todos.length; ++i) {
                if (this.state.todos[i] == todo) {
                    return i
                }
            }
            return 0
        },

        deleteTodo(todo) {
            Vue.set(this.selectedTodos, todo.uid, false)
            Vue.set(this.editableTodos, todo.uid, false)

            var idx = this.getTodoIdx(todo)

            this.state.todos.splice(idx, 1)
        },

        clearSelection() {
            this.state.todos.forEach((todo) => Vue.set(this.selectedTodos, todo.uid, false))
        },

        handleItemClick(todo, multiSelect) {
            if (!multiSelect) {
                this.clearSelection()
            }

            Vue.set(this.selectedTodos, todo.uid, !this.selectedTodos[todo.uid])

            Vue.nextTick(() =>
                         this.$refs['badges_' + todo.uid][0].scrollIntoView({block: 'nearest'}))
        },

        closeEditor(todo, ed) {
            ed.toTextArea()
            this.editableTodos[todo.uid] = false
        },

        handleEditorKey(todo, ed, event) {
            var ta = this.$refs['textareas_' + todo.uid][0]

            if (event.key == 'Enter' && event.ctrlKey)
            {
                var newtext = this.editingTodoText[todo.uid]

                if (todo.original != newtext) {
                    todo.original = newtext

                    if (!todo.modified) {
                        setModDate(todo, new Date())
                    }

                    rendertodo(todo)
                    todo.modified = true
                }

                this.closeEditor(todo, ed)

                event.preventDefault()
            } else if (event.key == 'Escape') {
                this.closeEditor(todo, ed)
                event.preventDefault()
            }
        },

        handleEditorChange(todo) {
        },

        handleGlobalKey(event) {
            this.activeContexts[this.activeContexts.length - 1](event)
        },

        cancelStatusCapture() {
            this.activeStatusShortcuts = []
            this.activeContexts.pop()
        },

        handleStatusKey(event) {
            event.preventDefault()

            if (event.key == 'Escape'
                || (event.key == 'g' && event.ctrlKey))
            {
                this.cancelStatusCapture()
                return
            }

            selection = event.key

            if (event.shiftKey) {
                selection = selection.toUpperCase()
            }

            for (var i = 0; i < this.activeStatusShortcuts.length; ++i) {
                var sc = this.activeStatusShortcuts[i]

                if (sc.shortcut == event.key) {
                    this.activeStatusShortcutCallback(sc)
                    this.cancelStatusCapture()
                    return
                }
            }
        },

        stopEvent(e) {
            e.stopPropagation()
        },

        handleTodoKey(event) {
            switch (event.key) {
            case 's':
                if (event.ctrlKey) {
                    this.saveState()
                    event.preventDefault()
                    break
                }

                this.activeContexts.push((e) => this.handleStatusKey(e))
                this.activeStatusShortcuts = this.state.setStateShortcuts
                this.activeStatusShortcutCallback = setTodoStatus
                event.preventDefault()
                event.stopPropagation()
                break

            case 'Enter':
                var todos = this.getSelectedTodos().filter(todo => !this.editableTodos[todo.uid])
                todos.forEach(todo => Vue.set(this.editableTodos, todo.uid,  true))
                event.preventDefault()

                Vue.nextTick(
                    () =>
                        todos.forEach(todo => {
                            var ta = this.$refs['textareas_' + todo.uid][0]
                            var ed = ta.mde

                            Vue.set(this.editingTodoText, todo.uid, todo.original)

                            ed.codemirror.on('keydown', (mirror, e) => {
                                this.handleEditorKey(todo, ed, e)
                                e.stopPropagation()
                            })
                        })
                )

                break

            case 'G':
                var firsttodo = this.getTodoFromIdx(0)
                if (firsttodo) {
                    this.handleItemClick(firsttodo)
                }

                break

            case 'g':
                if (!event.ctrlKey) {
                    var lasttodo = this.getTodoFromIdx(this.state.todos.length)

                    if (lasttodo) {
                        this.handleItemClick(lasttodo)
                    }
                    break
                }
                // fallthrough

            case 'Escape':
                this.clearSelection()
                break

            case 'i':
            case 'I':
                var selected = this.getSelectedTodos()
                var insertPos = event.shiftKey ? 0 : this.state.todos.length
                if (selected.length > 0) {
                    insertPos = this.getTodoIdx(event.shiftKey
                                                ? selected[0]
                                                : selected[selected.length - 1])
                    insertPos += event.shiftKey ? 0 : 1
                }
                var todo = maketodo()
                this.state.todos.splice(insertPos, 0, todo)
                this.handleItemClick(todo, false)

                break

            case '<':
                var selected = this.getSelectedTodos()
                this.moveTodosUp(selected)
                break

            case '>':
                var selected = this.getSelectedTodos()
                this.moveTodosDown(selected)
                break

            case 'n':
            case 'N':
                if (this.state.todos.length > 0) {
                    var selected = this.getSelectedTodos()

                    var idx = this.getTodoIdx(selected[selected.length - 1])
                    var newtodo = this.getTodoFromIdx(idx + 1)

                    if (newtodo) {
                        this.handleItemClick(newtodo, event.shiftKey)
                    }
                }
                break

            case 'P':
            case 'p':
                if (event.ctrlKey) {
                    event.preventDefault()
                }
                if (this.state.todos.length > 0) {
                    var selected = this.getSelectedTodos()

                    var idx = this.getTodoIdx(selected[0])
                    var newtodo = this.getTodoFromIdx(idx - 1)

                    if (newtodo) {
                        this.handleItemClick(newtodo, event.shiftKey)
                    }
                }
                break

            case 'k':
                var selected = this.getSelectedTodos()

                if (selected.length) {
                    var lasttodo = selected[selected.length - 1]
                    var lastidx = this.getTodoIdx(lasttodo)

                    var deleted = selected.map(
                        todo => {
                            var idx = this.getTodoIdx(todo)
                            this.deleteTodo(todo)
                            return { todo: todo, idx: idx }
                        }
                    )

                    this.state.deletedTodos.push(deleted)

                    var newtodo = this.getTodoFromIdx(lastidx)

                    if (newtodo) {
                        this.handleItemClick(newtodo)
                    }
                }

                break

            case 'u':
                var pkg = this.state.deletedTodos.pop()

                if (pkg) {
                    this.clearSelection()

                    pkg.forEach(
                        (old, idx) => {
                            this.state.todos.splice(old.idx + idx, 0, old.todo)
                            this.handleItemClick(old.todo, true)
                        }
                    )
                }
                break

            case 'x':
                this.state.todos.push(maketodo())
                break

            case 'c':
                this.showControlPanel = !this.showControlPanel
                break
            }
        },

        addStatusShortcut() {
            var pretty = this.$refs.addStatus_pretty.value.trim()

            if (pretty.length == 0) {
                pretty = null
            }

            this.state.setStateShortcuts.push({
                shortcut: this.$refs.addStatus_shortcut.value.trim(),
                pretty: pretty,
                text: this.$refs.addStatus_text.value.trim(),
            })
        },

        lookupStateShortcutIndex(shortcut) {
            for (var i = 0; i < this.state.setStateShortcuts.length; ++i) {
                if (this.state.setStateShortcuts[i] == shortcut) {
                    return i
                }
            }

            return null
        },

        swapStateShortcuts(idx1, idx2) {
            var elt1 = this.state.setStateShortcuts[idx1]
            var elt2 = this.state.setStateShortcuts[idx2]

            this.state.setStateShortcuts.splice(idx1, 1, elt2)
            this.state.setStateShortcuts.splice(idx2, 1, elt1)
        },

        deleteStateShortcut(shortcut) {
            var idx = this.lookupStateShortcutIndex(shortcut)

            if (idx != null) {
                this.state.setStateShortcuts.splice(idx, 1)
            }
        },

        moveStateShortcutRight(shortcut) {
            var idx = this.lookupStateShortcutIndex(shortcut)

            if (idx != null && idx != this.state.setStateShortcuts.length - 1) {
                this.swapStateShortcuts(idx, idx + 1)
            }
        },

        moveStateShortcutLeft(shortcut) {
            var idx = this.lookupStateShortcutIndex(shortcut)

            if (idx != null && idx != 0) {
                this.swapStateShortcuts(idx, idx - 1)
            }
        }
    },

    watch: {
        'state.documentTitle': function(newTitle, oldTitle) {
            document.title = newTitle + ' // Taskified'
        },

        state: {
            deep: true,
            handler: function(a, b) {
                this.changed = true
            }
        }
    },

    mounted() {
        window.addEventListener('keydown', (e) => this.handleGlobalKey(e))
        this.activeContexts.push((e) => this.handleTodoKey(e))
        this.loadStateFromJson(initialSavedFile__)
    }
})

window.addEventListener("beforeunload", function(event) {
    if (app.saving) {
        event.returnValue = "You're in the middle of saving chagnes. Continue?"
    } else if (app.changed) {
        event.returnValue = "You haven't saved changes yet. Continue?"
    }
});
