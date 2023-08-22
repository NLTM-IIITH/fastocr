import json
import shutil
from os.path import basename, join
from tempfile import TemporaryDirectory
from typing import Any, Dict

import requests
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models.query import QuerySet
from django.forms.models import BaseModelForm
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import CreateView, DetailView, View
from PIL import Image

from .models import Page


class IndexView(CreateView):
    model = Page
    fields = (
        'image', 'language'
    )
    template_name = 'core/index_old2.html'

class FancyIndexView(CreateView):
    model = Page
    fields = (
        'image', 'language'
    )
    template_name = 'core/index.html'


def delete(request, pk):
    page = Page.objects.filter(pk=pk)
    page.delete()
    return redirect('core:page-list')
    
    
def next(request, pk):
    page = Page.objects.get(pk=pk)
    next_page = Page.objects.filter(user=page.user, id__gt=page.id).order_by('id')
    if next_page.exists():
        return redirect(reverse_lazy('core:ocr', kwargs={'pk': next_page.first().pk}))
    else:
        return redirect('core:page-list')


class PageListView(LoginRequiredMixin, CreateView):
    model = Page
    fields = (
        'image', 'language'
    )
    template_name = 'core/page_list.html'
    success_url = reverse_lazy('core:page-list')
    
    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        kwargs.update({
            'page_list': Page.objects.filter(user=self.request.user),
        })
        return super().get_context_data(**kwargs)

    def form_valid(self, form: BaseModelForm) -> HttpResponse:
        form.instance.user = self.request.user
        return super().form_valid(form)


class OCRView(DetailView):
    model = Page
    template_name = 'core/ocr.html'


@csrf_exempt
def temp_ocr(request):
    print(request.POST)
    region = request.POST.get('region', '')
    region = json.loads(region)
    version = request.POST.get('version', 'v4')
    modality = request.POST.get('modality', 'printed')
    language = request.POST.get('language', 'english')
    layout_version = request.POST.get('layout_version', 'v2_doctr')
    print(language, modality, version, layout_version)
    if modality == 'handwritten' and version == 'v4':
        version = 'v4_hw'
    image = request.POST.get('image', '')
    tmp = TemporaryDirectory(prefix='image')
    folder = tmp.name
    r = requests.get(image, stream=True)
    r.raw.decode_content = True
    image_path = join(folder, 'image.jpg')
    cropped_path = join(folder, 'cropped_image.jpg')
    final_path = join(folder, 'final.jpg')
    with open(image_path, 'wb') as f:
        shutil.copyfileobj(r.raw, f)
    img = Image.open(image_path)
    img = img.crop((
        region['x'],
        region['y'],
        region['x'] + region['width'],
        region['y'] + region['height'],
    ))
    img.convert('RGB').save(cropped_path)
    page_image = Image.open(image_path)
    img = Image.new('RGB', page_image.size, (255,255,255))
    img.paste(
        Image.open(cropped_path),
        (region['x'], region['y'])
    )
    img.convert('RGB').save(final_path)
    r = requests.post(
        'http://10.4.16.103:8881/pageocr/api',
        headers={},
        data={
            'language': language,
            'modality': modality,
            'version': version,
            'layout_model': layout_version
        },
        files=[
            (
                'image',
                (
                    basename(final_path),
                    open(final_path, 'rb'),
                    'image/jpeg'
                )
            )
        ]
    )
    if r.ok:
        ocr = r.json()['text'].strip()
    else:
        ocr = ''
    return JsonResponse({
        'ocr': ocr,
        'ok': r.ok
    })