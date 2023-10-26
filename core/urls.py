from django.urls import path

from . import views

app_name = 'core'
urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('pages/', views.PageListView.as_view(), name='page-list'),
    path('delete/<int:pk>/', views.delete, name='delete'),
    path('next/<int:pk>/', views.next, name='next'),
    path('fancy/', views.FancyIndexView.as_view(), name='fancy'),
    path('ocr/<int:pk>/', views.OCRView.as_view(), name='ocr'),
    path('ocr/temp/', views.temp_ocr, name='temp'),
    path('pages/finetune/', views.finetune, name='finetune')
]
