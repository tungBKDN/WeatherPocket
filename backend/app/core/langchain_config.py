from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.utils.md_reader import md_reader

system_prompt = md_reader("app/prompts/system_prompt.md")

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# NOTE: the LangChain model/chain is no longer built eagerly here with a single
# key. GeminiKeyManager (app.core.gemini_key_manager) builds a fresh chain per
# call using the currently-active key, rolling to the next key on 429/quota.