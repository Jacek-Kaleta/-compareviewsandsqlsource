"use strict";
import { parse, Simplify } from './tXml.js';

function xmlToJson(xmltext) 
{
	let json = parse(xmltext,{keepWhitespace:true});
	json = Simplify(json);
	return json;
}

function distinct(table) 
{
	const unique = [...new Set(table)];
	return unique;
}

export function compare(xmlFile, sqlFile)
{
	let text = "Comparing  ... <br>";
	
	const json = xmlToJson(xmlFile) ;
	const ownersArray = json.RESULTS.ROW.map(x => x.COLUMN[0]._value);
	const ownersDistinct = distinct(ownersArray)

	if (ownersDistinct.length >1)
	{
		text += 'To many owners: ' + ownersDistinct.join(', ');
		return text
	}
	consolelog('Owner: ' + ownersDistinct[0]);
	const dbname = ownersDistinct[0];
	
	let views = {} ;
	{
		let j=0;
		const len = json.RESULTS.ROW.length ;

		while (j < len ) 
		{
			let owner = json.RESULTS.ROW[j].COLUMN[0]._value
			while (j < len && json.RESULTS.ROW[j].COLUMN[0]._value == owner) 
			{
				let name = json.RESULTS.ROW[j].COLUMN[1]._value.toUpperCase() ;
				let text = 'CREATE OR REPLACE VIEW '+dbname+'.'+name+' AS\r\n'+
					json.RESULTS.ROW[j].COLUMN[2]._value;
				text = changeDbOwner(text,name).trim();
				views[name] = {};
				views[name].prod = text ;
				j++;    
			}
		}
	}

	{
		sqlFile = sqlFile.replace(/\r/g, '');
		let lines = sqlFile.split("\n");
		let i= 0;
		while (i<= lines.length)
		{
			while 
				(
					i <= lines.length 
					&& ! checkAtTheBeginningOfLine(lines[i])
				) i++;

			if (i <= lines.length)
			{
				let text = lines[i]+"\r\n";
				i++;
				while 
				(
					i<= lines.length 
					&& ! checkAtTheBeginningOfLine(lines[i])  
					&& ! checkIfEndsWithSemicolon(lines[i])  
				)
				{
					text+= lines[i] +"\r\n";
					i++;
				}
				if(i <= lines.length && checkIfEndsWithSemicolon(lines[i]) )
				{
					text+= removeSemicolon(lines[i]) +"\r\n";
					i++;
				}
				let name = findAndStartWith(text).toUpperCase();
				text = changeDbOwner(text,name).trim();
				if (views[name] == undefined) views[name] = {};
				views[name].text = removeForceEditionable(text);
			}

			function removeSemicolon(str) {
				return str.replace(/;\s*$/, '');
			}

			function checkAtTheBeginningOfLine(text) 
			{	
				//const regex = /^\s*CREATE\s+OR\s+REPLACE\s+VIEW/i;
				const regex = /^\s*CREATE\s+OR\s+REPLACE\s+(FORCE\s+EDITIONABLE\s+)?VIEW/i;
				const startsWithCreateView = regex.test(text);
				return startsWithCreateView;
			}
			
			function removeForceEditionable(text)
			{
				const regex = /(CREATE\s+OR\s+REPLACE\s+)FORCE\s+EDITIONABLE\s+(VIEW)/;
				return text.replace(regex, '$1$2');
			}
			
			function checkIfEndsWithSemicolon(text) 
			{
				const regex = /;\s*$/;
				const endsWithSemicolon = regex.test(text);
				return endsWithSemicolon;
			}
			
			function findAndStartWith(text) 
			{
				{
					const regex = new RegExp(dbname+`\\.([^.\\s]+)(?=\\s|$)`, 'i');
					const result = text.match(regex);
					if (result && result[1]) 	return result[1];
				}
				{
					const regex = new RegExp(`"`+dbname+`"\\.([^.\\s]+)(?=\\s|$)`, 'i');
					const result = text.match(regex);
					if (result && result[1]) 	return result[1].replace(/^"|^'|"$|'$/g, '');
				}
			}
		}
	}

	function changeDbOwner(text,name)
	{
		return text.
			replace('"'+dbname+'"',dbname).
			replace('"'+name+'"', name);
	}

	var entries =  Object.getOwnPropertyNames(views);

	consolelog('No of entries '+entries.length);
	entries.forEach(function(key) 
	{
		if (views[key].prod == undefined) consolelog(key+' not found in xml file');
		else
		if (views[key].text == undefined) consolelog(key +' not found in sql file');
		else
		if (!sqlCompare(views[key].prod,views[key].text))
		consolelog(key+' are diffrent');
	});
	
	return text;

	function consolelog(outtext)
	{
		text+= outtext+"<br>";
	}

	function sqlCompare(code1, code2)
	{
		//console.log(code1);
		//console.log(code2);
		let code1len = code1.length ;
		let code2len = code2.length ;
		let v1 = code1 ;
		let v2 = code2 ;
		let pos1=0;
		let pos2=0;
		
		function c1()
		{
			return v1.charAt(pos1).toLowerCase();
		}

		function c_1()
		{
			return v1.charAt(pos1);
		}

		function c1blank()
		{
			if (c1()==" ") return true;
			if (c1()=="\r") return true;
			if (c1()=="\n") return true;
			if (c1()=="\t") return true;
			return false;
		}

		function c2()
		{
			return v2.charAt(pos2).toLowerCase();
		}

		function c_2()
		{
			return v2.charAt(pos2);
		}

		function c2blank()
		{
			if (c2()==" ") return true;
			if (c2()=="\r") return true;
			if (c2()=="\n") return true;
			if (c2()=="\t") return true;
			return false;
		}

		function skipblank1()
		{
			while (true)
			{
				while (pos1< code1len && c1blank()) pos1++;
				if (!checkcomment1()) return ;
			}
		}
		
		function skipblank2()
		{
			while (true)
			{
				while (pos2< code2len && c2blank()) pos2++;
				if (!checkcomment2()) return ;
			}
		}

		function checkcomment1()
		{
			if (pos1 < code1len-1 && v1.substr(pos1,2)=='--')
			{
				pos1++;
				pos1++;
				while (pos1 < code1len && v1.charAt(pos1)!='\r' && v1.charAt(pos1)!='\n') pos1++;
				while (pos1 < code1len && c1blank()) pos1++;
				return true ;
			} else return false;
		}
		
		function checkcomment2()
		{
			if (pos2 < code2len-1 && v2.substr(pos2,2)=='--')
			{
				pos2++;
				pos2++;
				while (pos2 < code2len && v2.charAt(pos2)!='\r' && v2.charAt(pos2)!='\n') pos2++;
				while (pos2 < code2len && c2blank()) pos2++;
				return true ;
			} else return false;
		}

		function checkchar(c)
		{
			if (c1() == c  && c2()==c)
			{
				pos1++;
				pos2++;
				skipblank1();
				skipblank2();
				return true;
			} else
			if (c1() == c  && c2blank())
			{
				skipblank2();
				return true;
			} else
			if (c2() == c && c1blank())
			{
				skipblank1();
				return true;
			} 
			else
			return false;
		}

		while (1)
		{
			if (pos1 >= code1len) 
			{
				skipblank2();
				if (pos2 < code2len)
					return false
				//scroll();
				return true;
			}
			if (pos2 >= code2len) 
			{
				skipblank1();
				if (pos1 < code1len)
					return false
				return true;
			}

			if (pos1 < code1len-1 && v1.substr(pos1,2)=='--')
			{
				pos1++;
				pos1++;
				while (pos1 < code1len && v1.charAt(pos1)!='\r' && v1.charAt(pos1)!='\n') pos1++;
				while (pos1 < code1len && c1blank()) pos1++;
			} else
			if (pos2 < code2len-1 && v2.substr(pos2,2)=='--')
			{
				pos2++;
				pos2++;
				while (pos2 < code2len && v2.charAt(pos2)!='\r' && v2.charAt(pos2)!='\n') pos2++;
				while (pos2 < code2len && c2blank()) pos2++;
			} else
			if (pos1 < code1len-1 && v1.substr(pos1,2)=='/*')
			{
				while (pos1 < code1len-1 && v1.substr(pos1,2)!='*/') pos1++;
				pos1++;
				pos1++;
				while (pos1< code1len && c1blank()) pos1++;
				while (pos2< code2len && c2blank()) pos2++;
			} else
			if (pos2 < code2len-1 && v2.substr(pos2,2)=='/*')
			{
				while (pos2 < code2len-1 && v2.substr(pos2,2)!='*/') pos2++;
				pos2++;
				pos2++;
				while (pos1< code1len && c1blank()) pos1++;
				while (pos2< code2len && c2blank()) pos2++;
			} else
			if (checkchar(','));else
			if (checkchar('('));else
			if (checkchar(')'));else
			if (checkchar('<'));else
			if (checkchar('>'));else
			if (checkchar('='));else
			if (checkchar('|'));else
			if (c1blank() && c2blank())
			{
				while (pos1< code1len && c1blank()) pos1++;
				while (pos2< code2len && c2blank()) pos2++;
			}
			else
			if (c1 () == '\'' && c2 () == '\'')
			{
				pos1++;
				pos2++;
				while (pos1 < code1len && pos2 < code2len && c_1() == c_2() && c_1() != '\'')
				{
					pos1++;
					pos2++;
				}
				if (pos1< code1len && c_1() =='\'' && pos2< code2len && c_2() =='\'')
				{
					pos1++;
					pos2++;
				} ;
				while ( pos1 < code1len &&  c1blank() ) 
				{
					pos1++
				}
				while ( pos2 < code2len && c2blank()) 
				{
					pos2++
				}
			} else
			if (c1 ()!=  c2())
			{
				if ( pos1 < code1len)
				if ( pos2 < code2len)
				if ( c1 ()!=  c2() )
				{
					return false;
				}
			} else
			{
				pos1++;
				pos2++;
			}
		}
	}
}