
function sanitizeHtml(text) {
    var div = document.createElement('div')
    div.innerText = text
    return div.innerHTML.replace(/<br>/g, '\n')
}

function markdown(text) {
    return marked(sanitizeHtml(text))
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
            && (datediff < 7))
        {
            var hour = date.hour % 12
            var ampm = date.hour >= 12 ? 'pm' : 'am';

            if (hour == 0) {
                hour = '12'
            }
            var suffix = ''
            var prefix = ''
            if (datediff == 1) {
                suffix = ' yest.'
            } else if (datediff > 0 && datediff < 7) {
                prefix = td.toLocaleString('en-us', { weekday: 'long' }) + ', '
            }
            return prefix + hour + ':' + (date.minute.toString().padStart(2, '0')) + ' ' + ampm + suffix
        } else if (td.getMonth() == today.getMonth() &&
                   today.getDate() - td.getDate() < 7)
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

function maketodo() {
    var date = new Date()

    var todo = {
        status: '',
        original: 'yark',
        rendered: markdown('yark'),
        editable: false,
        selected: false,
        modified: false,
        uid: Math.random().toString(36).substring(2, 15)
    }

    setCreateDate(todo, date)
    setModDate(todo, date)

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
        this.mde.codemirror.on('changes', () => this.$emit('input', this.mde.value()))
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
            documentTitle: '',
            todos: [ ],
            deletedTodos: [ ],
        },
        activeStatusShortcuts: [ ],
        setTodoStateShortcuts: [
            { shortcut: 'c',
              text: '✓',
              action: setTodoStatus },
            { shortcut: 't',
              text: '☐',
              action: setTodoStatus },
            { shortcut: 'T',
              text: '☑',
              action: setTodoStatus },
            { shortcut: 'n',
              text: '',
              pretty: '[clear]',
              action: setTodoStatus },
            { shortcut: 'f',
              text: '⮕',
              action: setTodoStatus },
            { shortcut: 'b',
              text: '⇨',
              action: setTodoStatus }
        ],
        activeContexts: [ ],
    },
    methods: {
        startUpdatingDocTitle() {
            this.activeContexts.push((e) => e.stopPropagation())
        },

        updateDocumentTitle(t) {
            this.activeContexts.pop()
            this.state.documentTitle = this.$refs.docTitle.innerText
        },

        formatDate(d) {
            return formatDate(d)
        },

        getSelectedTodos() {
            return this.state.todos.filter(todo => todo.selected)
        },

        saveState() {
            var savestring = JSON.stringify(this.state)
            window.localStorage.setItem('savestate', savestring)

            var blob = new Blob([savestring], {type: "text/plain;charset=utf-8"})
            saveAs(blob, this.state.documentTitle + ".json")
        },

        loadStateFromLocalStorage() {
            var state = window.localStorage.getItem('savestate')

            if (state) {
                this.state = JSON.parse(state)
            }

            this.postLoadState()
        },

        postLoadState() {
            this.clearSelection()
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
                    return i;
                }
            }
            return 0;
        },

        deleteTodo(todo) {
            todo.selected = false
            todo.editable = false
            var idx = this.getTodoIdx(todo)

            this.state.todos.splice(idx, 1)
        },

        clearSelection() {
            this.state.todos.forEach((todo) => todo.selected = false)
        },

        handleItemClick(todo, shiftKey) {
            if (!shiftKey) {
                this.clearSelection()
            }

            todo.selected = true

            Vue.nextTick(() =>
                         this.$refs['badges_' + todo.uid][0].scrollIntoView({block: 'nearest'}))
        },

        handleEditorKey(todo, ed, event) {
            var ta = this.$refs['textareas_' + todo.uid][0]

            if (event.key == 'Escape'
                || event.key == "Enter" && event.ctrlKey)
            {
                //todo.original = ed.value()
                todo.rendered = markdown(todo.original)
                ed.toTextArea()
                todo.editable = false

                event.stopPropagation()
                event.preventDefault()
            }
        },

        handleEditorChange(todo) {
            setModDate(todo, new Date())
            todo.modified = !datesEqual(todo.modDate, todo.createDate)
        },

        handleGlobalKey(event) {
            this.activeContexts[this.activeContexts.length - 1](event)
        },

        cancelStatusCapture() {
            this.activeStatusShortcuts = []
            this.activeContexts.pop()
        },

        handleStatusKey(event) {
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
                    sc.action.call(this, sc)
                    this.cancelStatusCapture()
                    return
                }
            }
        },

        handleTodoKey(event) {
            switch (event.key) {
            case 's':
                if (event.ctrlKey) {
                    this.saveState()
                    break
                }

                this.activeContexts.push((e) => this.handleStatusKey(e))
                this.activeStatusShortcuts = this.setTodoStateShortcuts
                event.preventDefault()
                event.stopPropagation()
                break

            case 'Enter':
                var todos = this.getSelectedTodos().filter(todo => !todo.editable)
                todos.forEach(todo => todo.editable = true)
                event.preventDefault()

                Vue.nextTick(
                    () =>
                        todos.forEach(todo => {
                            var ta = this.$refs['textareas_' + todo.uid][0]
                            var ed = ta.mde

                            ed.value(todo.original)

                            ed.codemirror.on('keydown', (mirror, e) => {
                                e.stopPropagation()
                                this.handleEditorKey(todo, ed, e)
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
                this.getSelectedTodos().forEach(todo => todo.selected = false)
                break

            case 'n':
            case 'N':
            case 'ArrowDown':
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
            case 'ArrowUp':
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
            }
        }
    },

    watch: {
        'state.documentTitle': function(newTitle, oldTitle) {
            document.title = newTitle + ' // Taskified'
        }
    },
    
    mounted() {
        window.addEventListener('keydown', (e) => this.handleGlobalKey(e))
        this.activeContexts.push((e) => this.handleTodoKey(e))
        this.loadStateFromLocalStorage()
    }
})
