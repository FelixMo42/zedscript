const {
    createConnection,
	TextDocuments,
	DiagnosticSeverity,
	ProposedFeatures,
	DidChangeConfigurationNotification,
	CompletionItemKind
} = require("vscode-languageserver")

// initilization //

let connection = createConnection(ProposedFeatures.all)

let documents = new TextDocuments()

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params) => {
    let capabilities = params.capabilities

    hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	)
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	)
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	)

    return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	}
})

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined)
    }
    
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.')
		})
    }
})

const defaultSettings = { maxNumberOfProblems: 1000 }
let globalSettings = defaultSettings
let documentSettings = new Map()

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear()
	} else {
		globalSettings = (change.settings.languageServerExample || defaultSettings)
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument)
})

function getDocumentSettings(resource) {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings)
    }
    
    let result = documentSettings.get(resource)
    
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		})
    
        documentSettings.set(resource, result)
    }
    
	return result
}

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri)
})

documents.onDidChangeContent(change => {
	validateTextDocument(change.document)
})

async function validateTextDocument(textDocument) {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri)

	let text = textDocument.getText()
	
    // let diagnostic = {
    //     severity: DiagnosticSeverity.Warning,
    //     range: {
    //         start: textDocument.positionAt(0),
    //         end: textDocument.positionAt(1)
    //     },
    //     message: `Error`,
    //     source: 'zed-parser'
    // }
        
    // if (hasDiagnosticRelatedInformationCapability) {
    //     diagnostic.relatedInformation = [
    //         {
    //             location: {
    //                 uri: textDocument.uri,
    //                 range: Object.assign({}, diagnostic.range)
    //             },
    //             message: 'Spelling matters'
    //         },
    //         {
    //             location: {
    //                 uri: textDocument.uri,
    //                 range: Object.assign({}, diagnostic.range)
    //             },
    //             message: 'Particularly for names'
    //         }
    //     ]
    // }

	// // Send the computed diagnostics to VSCode.
	// connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [diagnostic] })
}

connection.onDidChangeWatchedFiles(change => {
	console.log('We received an file change event')
})

// Auto Complete //

connection.onCompletion(
    (textDocumentPosition) => {
        return [
            {
                label: 'let',
                kind: CompletionItemKind.Text,
                data: 1
            }
        ]
    }
)

connection.onCompletionResolve( item => {
    if (item.data === 1) {
        item.detail = 'let details'
        item.documentation = 'let documentation'
    }

    return item
} )

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`)
})
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`)
})
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`)
})
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()