from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from app.core.config import settings
from app.utils.md_reader import md_reader

model = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    google_api_key=settings.GEMINI_API_KEY,
    streaming=True,
)

system_prompt = md_reader("app/prompts/system_prompt.md")

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

base_chain = prompt | model | StrOutputParser()