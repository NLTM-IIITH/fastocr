import base64
import json
import shutil
import requests
import tempfile
import time
import os
import io
import zipfile
import subprocess
from os.path import basename, join
from tempfile import TemporaryDirectory
from typing import Any, Dict
from PIL import Image , ImageDraw
from io import BytesIO

import requests
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.db.models.query import QuerySet
from django.forms.models import BaseModelForm
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import CreateView, DetailView, View
from django.conf import settings
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
            'page_list': Page.objects.filter(user=self.request.user).order_by('-id'),
        })
        return super().get_context_data(**kwargs)

    def form_valid(self, form: BaseModelForm) -> HttpResponse:
        form.instance.user = self.request.user
        return super().form_valid(form)


class OCRView(DetailView):
    model = Page
    template_name = 'core/ocr.html'


def call_bhashini_api(url, filepath, language):
    LANGUAGES = {
        'hindi': 'hi',
        'english': 'en',
        'marathi': 'mr',
        'tamil': 'ta',
        'telugu': 'te',
        'kannada': 'kn',
        'gujarati': 'gu',
        'punjabi': 'pa',
        'bengali': 'bn',
        'malayalam': 'ml',
        'assamese': 'asa',
        'manipuri': 'mni',
        'oriya': 'ori',
        'urdu': 'ur',
    }
    request = {
        "image": [{
            "imageContent": base64.b64encode(open(filepath, 'rb').read()).decode()
        }],
        "config": {"languages": [{
            "sourceLanguage": LANGUAGES[language]
        }]}
    }
    r = requests.post(
        url,
        headers={'Content-Type': 'application/json'},
        data=json.dumps(request)
    )
    print(r.text)
    if r.ok:
        ret = r.json()['output'][0]['source']
    else:
        ret = ''
    return JsonResponse({
        'ocr': ret,
        'ok': r.ok
    })


@csrf_exempt
def temp_ocr(request):
    print(request.POST)
    region = request.POST.get('region', '')
    region = json.loads(region)
    version = request.POST.get('version', 'v4')
    modality = request.POST.get('modality', 'printed')
    language = request.POST.get('language', 'english')
    custom_link = request.POST.get('custom_link', '')
    server = request.POST.get('server', '')
    if server in ('', 'dhruva'):
        return JsonResponse({
            'ocr': '',
            'ok': False
        })
    layout_version = request.POST.get('layout_version', 'v2_doctr')
    print(language, modality, version, layout_version, custom_link)
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

    # TODO: remove this ilocr hardcode in the future
    if custom_link and 'ilocr' not in custom_link:
        return call_bhashini_api(custom_link, final_path, language)

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

def finetune(request):
    user = Page.objects.filter(user=request.user)
    user_data=[]
    filenames=[]
    for i in request.POST:
        if(i!='csrfmiddlewaretoken' or i!='pagetable_length'):
            filenames.append(i)

    for i in user:
        if i.filename in filenames:
            user_data.append(i)

    if(len(user_data)==3):
        temp_dir = os.path.join(settings.MEDIA_ROOT,'temp_dir','ajoy_style_gt')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        img_dir = os.path.join(temp_dir,'images')
        if not os.path.exists(img_dir):
            os.makedirs(img_dir)

        gt=os.path.join(temp_dir,'gt.txt')
        for i in user_data:
            url = 'http://10.4.16.81:8812/fastocr/media/' + str(i.upload)
            lang = i.language
            response = requests.get(url)
            if response.status_code == 200:
                json_content = response.json()
                for j in json_content['regions']:
                    for k in j['words']:
                        print(k['id'],k['x'],k['y'],k['w'],k['h'])
                        my_image = Page.objects.get(id=i.id).image
                        image = Image.open(io.BytesIO(my_image.read()))
                        image_format = image.format
                        print(image_format)
                        if image_format != "JPEG":
                            output = io.BytesIO()
                            image.save(output, format="JPEG")
                            
                        cropped_img = image.crop((k['x'], k['y'], k['x'] + k['w'], k['y'] + k['h']))
                        fname='{fname}.jpg'.format(fname=k['id'])
                        cropped_img.save(os.path.join(img_dir,fname))
                        with open(gt, 'a') as file:
                            file.write('images/'+k['id']+'.jpg'+"\t"+k['text']+'\n')
            else:
                print(f"Failed to retrieve JSON file. Status code: {response.status_code}")           
        zip_name = "media/{a}".format(a=k['id'])
        print(os.path.join(settings.BASE_DIR,zip_name))
        archived = shutil.make_archive(os.path.join(settings.BASE_DIR,zip_name), 'zip', os.path.join(settings.BASE_DIR,"media/temp_dir"))
        # /home/apoorva/custom-ocr/fastocr/media/temp_dir
        file_paths = {"dataset_file":os.path.join(settings.BASE_DIR,(str(zip_name)+".zip")),"pretrained_model":os.path.join(settings.BASE_DIR,"pretrained_model_input.zip")}
        files = {key: open(path, 'rb') for key, path in file_paths.items()}
        data = {"lang":lang, "status":"pending"}

        response = requests.post("http://10.4.16.81:2901/", files=files, data=data)

        if response.status_code == 200:
            data = response.json()
            print(data)
        else:
            print(f"API call failed with status code {response.status_code}")

    else:
        messages.error(request,"Please check 3 boxes")
        return redirect('core:page-list')
    messages.success(request, 'Please check in the database for the output zip file')
    if os.path.exists(os.path.join(settings.MEDIA_ROOT,'temp_dir')):
        shutil.rmtree(os.path.join(settings.MEDIA_ROOT,'temp_dir'))
    return redirect('core:page-list')