import gensim.downloader as api
from gensim.models.fasttext import FastTextKeyedVectors

# Load pre-trained FastText model
ft_model = api.load("fasttext-wiki-news-subwords-300")

def get_word_similarity(word1, word2):
    """Calculate cosine similarity between two words"""
    return ft_model.similarity(word1, word2)
