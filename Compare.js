import { compare } from './CompareViews.js';

let xmlText = undefined ;
let sqlText = undefined ;
let compared = 0;

const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', function(event) 
{
	if (compared) 
	{
		clear();
		xmlText = undefined ;
		sqlText = undefined ;
		compared =0;
	}
	const selectedFile = event.target.files[0];
	loadFile(selectedFile);
});

const compareBtn = document.getElementById('compare');
compareBtn.addEventListener('click', function(event) 
{
	comparedefinitions()
	compared=1;
});

function loadFile(file) {
	let reader = new FileReader();
	reader.onload = function(event) 
	{
		let fileContent = event.target.result;
		if (file.name.split('.').pop().toLowerCase() =='xml')
		{
			xmlText = fileContent;
			message('XML file '+file.name+' loaded. Length '+xmlText.length);
		}
		else
		if (file.name.split('.').pop().toLowerCase() =='sql' || file.name.split('.').pop().toLowerCase() =='txt')
		{
			if (sqlText == undefined) sqlText = fileContent;
			else sqlText += '\r\n'+ fileContent;
			message('SQL file '+file.name+' loaded. Length '+sqlText.length);

		} else message('Unknow file type !');
	};
	reader.readAsText(file);
}

function clear(msg)
{
	output.innerHTML ="" ;
}

function message(msg)
{
	output.innerHTML = output.innerHTML+'<br>'+msg ;
}

function comparedefinitions()
{
	clear();
	if (xmlText == undefined)
	{
		message('XML not loaded !');
		return ;
	}
	if (sqlText == undefined)
	{
		message('SQL not loaded !');
		return ;
	}
	
	message(compare(xmlText, sqlText))
	return  ;
}